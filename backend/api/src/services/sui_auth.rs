use crate::error::{AppError, AppResult};
use base64::{engine::general_purpose::STANDARD as B64, Engine};
use blake2::{digest::consts::U32, Blake2b, Digest};
use ed25519_dalek::{Signature as Ed25519Signature, Verifier, VerifyingKey as Ed25519VerifyingKey};
use k256::ecdsa::{Signature as Secp256k1Signature, VerifyingKey as Secp256k1VerifyingKey};
use p256::ecdsa::{Signature as Secp256r1Signature, VerifyingKey as Secp256r1VerifyingKey};
use serde::{Deserialize, Serialize};
use sha2::Sha256;

const ED25519_FLAG: u8 = 0x00;
const SECP256K1_FLAG: u8 = 0x01;
const SECP256R1_FLAG: u8 = 0x02;
const ZKLOGIN_FLAG: u8 = 0x05;
const PASSKEY_FLAG: u8 = 0x06;

const ED25519_PK_LEN: usize = 32;
const SECP_PK_LEN: usize = 33;
const SIG_LEN: usize = 64;

#[derive(Serialize)]
struct Intent {
    scope: u8,
    version: u8,
    app_id: u8,
}

#[derive(Serialize)]
struct IntentMessage<'a> {
    intent: Intent,
    #[serde(with = "serde_bytes")]
    value: &'a [u8],
}

#[derive(Deserialize)]
struct PasskeyAuthenticator {
    authenticator_data: Vec<u8>,
    client_data_json: String,
    user_signature: Vec<u8>,
}

#[derive(Deserialize)]
struct ClientDataJson {
    #[serde(rename = "type")]
    kind: String,
    challenge: String,
}

fn normalize_address(address: &str) -> String {
    let mut hex = address.trim().to_lowercase();
    if hex.starts_with("0x") {
        hex = hex[2..].to_string();
    }
    format!("0x{:0>64}", hex)
}

fn sui_address_from_flagged_pubkey(scheme: u8, pubkey: &[u8]) -> String {
    let mut hasher = Blake2b::<U32>::new();
    hasher.update([scheme]);
    hasher.update(pubkey);
    let hash = hasher.finalize();
    format!("0x{}", hex::encode(hash))
}

fn personal_message_digest(message: &str) -> [u8; 32] {
    let message_bytes = message.as_bytes();
    let intent_msg = IntentMessage {
        intent: Intent {
            scope: 3,
            version: 0,
            app_id: 0,
        },
        value: message_bytes,
    };
    let bytes = bcs::to_bytes(&intent_msg).expect("bcs intent message");
    Blake2b::<U32>::digest(&bytes).into()
}

fn sha256_digest(bytes: &[u8]) -> [u8; 32] {
    Sha256::digest(bytes).into()
}

fn decode_b64url(data: &str) -> AppResult<Vec<u8>> {
    let padded = match data.len() % 4 {
        2 => format!("{data}=="),
        3 => format!("{data}="),
        _ => data.to_string(),
    };
    B64.decode(padded.replace('-', "+").replace('_', "/"))
        .map_err(|_| AppError::BadRequest("invalid base64url encoding".into()))
}

fn verify_address(scheme: u8, pubkey: &[u8], expected: &str) -> AppResult<()> {
    let derived = sui_address_from_flagged_pubkey(scheme, pubkey);
    if derived != expected {
        return Err(AppError::Unauthorized);
    }
    Ok(())
}

fn verify_ed25519(raw: &[u8], message: &str, expected: &str) -> AppResult<()> {
    if raw.len() != 1 + SIG_LEN + ED25519_PK_LEN {
        return Err(AppError::BadRequest("invalid Ed25519 signature length".into()));
    }

    let sig_bytes: [u8; 64] = raw[1..65]
        .try_into()
        .map_err(|_| AppError::BadRequest("invalid signature bytes".into()))?;
    let pk_bytes: [u8; 32] = raw[65..97]
        .try_into()
        .map_err(|_| AppError::BadRequest("invalid public key bytes".into()))?;

    verify_address(ED25519_FLAG, &pk_bytes, expected)?;

    let verifying_key = Ed25519VerifyingKey::from_bytes(&pk_bytes)
        .map_err(|_| AppError::BadRequest("invalid public key".into()))?;
    let signature = Ed25519Signature::from_bytes(&sig_bytes);
    let digest = personal_message_digest(message);

    verifying_key
        .verify(&digest, &signature)
        .map_err(|_| AppError::Unauthorized)
}

fn verify_secp256k1(raw: &[u8], message: &str, expected: &str) -> AppResult<()> {
    if raw.len() != 1 + SIG_LEN + SECP_PK_LEN {
        return Err(AppError::BadRequest("invalid Secp256k1 signature length".into()));
    }

    let sig_bytes = &raw[1..1 + SIG_LEN];
    let pk_bytes = &raw[1 + SIG_LEN..];

    verify_address(SECP256K1_FLAG, pk_bytes, expected)?;

    let digest = sha256_digest(&personal_message_digest(message));
    let verifying_key = Secp256k1VerifyingKey::from_sec1_bytes(pk_bytes)
        .map_err(|_| AppError::BadRequest("invalid public key".into()))?;
    let signature = Secp256k1Signature::from_slice(sig_bytes)
        .map_err(|_| AppError::BadRequest("invalid signature bytes".into()))?;

    verifying_key
        .verify(&digest, &signature)
        .map_err(|_| AppError::Unauthorized)
}

fn verify_secp256r1(raw: &[u8], message: &str, expected: &str) -> AppResult<()> {
    if raw.len() != 1 + SIG_LEN + SECP_PK_LEN {
        return Err(AppError::BadRequest("invalid Secp256r1 signature length".into()));
    }

    let sig_bytes = &raw[1..1 + SIG_LEN];
    let pk_bytes = &raw[1 + SIG_LEN..];

    verify_address(SECP256R1_FLAG, pk_bytes, expected)?;

    let digest = sha256_digest(&personal_message_digest(message));
    let verifying_key = Secp256r1VerifyingKey::from_sec1_bytes(pk_bytes)
        .map_err(|_| AppError::BadRequest("invalid public key".into()))?;
    let signature = Secp256r1Signature::from_slice(sig_bytes)
        .map_err(|_| AppError::BadRequest("invalid signature bytes".into()))?;

    verifying_key
        .verify(&digest, &signature)
        .map_err(|_| AppError::Unauthorized)
}

fn verify_passkey(raw: &[u8], message: &str, expected: &str) -> AppResult<()> {
    let authenticator: PasskeyAuthenticator = bcs::from_bytes(&raw[1..])
        .map_err(|_| AppError::BadRequest("invalid passkey signature payload".into()))?;

    let client_data: ClientDataJson = serde_json::from_str(&authenticator.client_data_json)
        .map_err(|_| AppError::BadRequest("invalid passkey client data".into()))?;

    if client_data.kind != "webauthn.get" {
        return Err(AppError::Unauthorized);
    }

    let challenge = decode_b64url(&client_data.challenge)?;
    if challenge != message.as_bytes() {
        return Err(AppError::Unauthorized);
    }

    if authenticator.user_signature.len() != 1 + SIG_LEN + SECP_PK_LEN {
        return Err(AppError::BadRequest("invalid passkey user signature".into()));
    }

    let pk_bytes = &authenticator.user_signature[1 + SIG_LEN..];
    verify_address(PASSKEY_FLAG, pk_bytes, expected)?;

    let mut payload =
        Vec::with_capacity(authenticator.authenticator_data.len() + 32);
    payload.extend_from_slice(&authenticator.authenticator_data);
    payload.extend_from_slice(&sha256_digest(
        authenticator.client_data_json.as_bytes(),
    ));

    let digest = sha256_digest(&payload);
    let sig_bytes = &authenticator.user_signature[1..1 + SIG_LEN];
    let verifying_key = Secp256r1VerifyingKey::from_sec1_bytes(pk_bytes)
        .map_err(|_| AppError::BadRequest("invalid public key".into()))?;
    let signature = Secp256r1Signature::from_slice(sig_bytes)
        .map_err(|_| AppError::BadRequest("invalid signature bytes".into()))?;

    verifying_key
        .verify(&digest, &signature)
        .map_err(|_| AppError::Unauthorized)
}

#[derive(Serialize)]
struct ZkLoginVerifyVariables<'a> {
    bytes: &'a str,
    signature: &'a str,
    #[serde(rename = "intentScope")]
    intent_scope: &'a str,
    author: &'a str,
}

#[derive(Serialize)]
struct ZkLoginVerifyRequest<'a> {
    query: &'static str,
    variables: ZkLoginVerifyVariables<'a>,
}

#[derive(Deserialize)]
struct ZkLoginGraphQlResponse {
    data: Option<ZkLoginGraphQlData>,
    errors: Option<Vec<GraphQlError>>,
}

#[derive(Debug, Deserialize)]
struct GraphQlError {
    message: String,
}

#[derive(Deserialize)]
struct ZkLoginGraphQlData {
    #[serde(rename = "verifyZkLoginSignature")]
    verify_zklogin_signature: Option<ZkLoginVerifyResult>,
}

#[derive(Deserialize)]
struct ZkLoginVerifyResult {
    success: Option<bool>,
}

const ZKLOGIN_VERIFY_QUERY: &str = r#"query Zklogin($bytes: Base64!, $signature: Base64!, $intentScope: ZkLoginIntentScope!, $author: SuiAddress!) {
  verifyZkLoginSignature(bytes: $bytes, signature: $signature, intentScope: $intentScope, author: $author) {
    success
  }
}"#;

fn zklogin_graphql_urls(primary: &str) -> Vec<String> {
    let mut urls = vec![primary.to_string()];
    let alternates: &[&str] = if primary.contains("mainnet") {
        &[
            "https://graphql.mainnet.sui.io/graphql",
            "https://sui-mainnet.mystenlabs.com/graphql",
        ]
    } else {
        &[
            "https://graphql.testnet.sui.io/graphql",
            "https://sui-testnet.mystenlabs.com/graphql",
        ]
    };
    for alt in alternates {
        if !urls.iter().any(|u| u == alt) {
            urls.push((*alt).to_string());
        }
    }
    urls
}

async fn post_zklogin_verify(
    client: &reqwest::Client,
    graphql_url: &str,
    body: &ZkLoginVerifyRequest<'_>,
) -> Result<reqwest::Response, reqwest::Error> {
    client.post(graphql_url).json(body).send().await
}

async fn verify_zklogin(
    address: &str,
    message: &str,
    signature_b64: &str,
    graphql_url: &str,
) -> AppResult<()> {
    let body = ZkLoginVerifyRequest {
        query: ZKLOGIN_VERIFY_QUERY,
        variables: ZkLoginVerifyVariables {
            bytes: &B64.encode(message.as_bytes()),
            signature: signature_b64.trim(),
            intent_scope: "PERSONAL_MESSAGE",
            author: address,
        },
    };

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .build()
        .map_err(|e| AppError::Internal(e.into()))?;

    let mut last_transport_err: Option<String> = None;
    let mut resp = None;

    for url in zklogin_graphql_urls(graphql_url) {
        match post_zklogin_verify(&client, &url, &body).await {
            Ok(r) => {
                if url != graphql_url {
                    tracing::info!(url = %url, "zkLogin verify succeeded via fallback GraphQL endpoint");
                }
                resp = Some(r);
                break;
            }
            Err(e) => {
                tracing::warn!(url = %url, error = %e, "zkLogin GraphQL endpoint unreachable");
                last_transport_err = Some(e.to_string());
            }
        }
    }

    let resp = resp.ok_or_else(|| {
        AppError::Internal(anyhow::anyhow!(
            "zkLogin verify request failed: {}",
            last_transport_err.unwrap_or_else(|| "no GraphQL endpoints reachable".into())
        ))
    })?;

    if !resp.status().is_success() {
        return Err(AppError::Internal(anyhow::anyhow!(
            "zkLogin verify HTTP {}",
            resp.status()
        )));
    }

    let parsed: ZkLoginGraphQlResponse = resp.json().await.map_err(|e| {
        AppError::Internal(anyhow::anyhow!("zkLogin verify response parse failed: {e}"))
    })?;

    if parsed
        .data
        .and_then(|d| d.verify_zklogin_signature)
        .and_then(|r| r.success)
        == Some(true)
    {
        return Ok(());
    }

    if let Some(errors) = &parsed.errors {
        let messages: Vec<&str> = errors.iter().map(|e| e.message.as_str()).collect();
        tracing::warn!(?messages, "zkLogin signature verification failed");
    } else {
        tracing::warn!("zkLogin signature verification failed without GraphQL errors");
    }
    Err(AppError::Unauthorized)
}

/// Verify a Sui wallet personal-message signature.
pub async fn verify_personal_message(
    address: &str,
    message: &str,
    signature_b64: &str,
    graphql_url: &str,
) -> AppResult<()> {
    let expected = normalize_address(address);
    let raw = B64
        .decode(signature_b64.trim())
        .map_err(|_| AppError::BadRequest("invalid signature encoding".into()))?;

    if raw.is_empty() {
        return Err(AppError::BadRequest("signature too short".into()));
    }

    match raw[0] {
        ED25519_FLAG => verify_ed25519(&raw, message, &expected),
        SECP256K1_FLAG => verify_secp256k1(&raw, message, &expected),
        SECP256R1_FLAG => verify_secp256r1(&raw, message, &expected),
        PASSKEY_FLAG => verify_passkey(&raw, message, &expected),
        ZKLOGIN_FLAG => {
            verify_zklogin(&expected, message, signature_b64.trim(), graphql_url).await
        }
        _ => Err(AppError::BadRequest("unsupported signature scheme".into())),
    }
}
