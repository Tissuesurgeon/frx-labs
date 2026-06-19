import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/cn';

const sizePx = {
  sm: 24,
  md: 32,
  lg: 40,
} as const;

type LogoProps = {
  showText?: boolean;
  size?: keyof typeof sizePx;
  href?: string;
  subtitle?: string;
  className?: string;
  textClassName?: string;
};

export function Logo({
  showText = true,
  size = 'md',
  href,
  subtitle,
  className,
  textClassName,
}: LogoProps) {
  const px = sizePx[size];

  const content = (
    <div className={cn('flex items-center gap-2.5', className)}>
      <Image
        src="/frx-labs-logo.png"
        alt="FRX Labs"
        width={px}
        height={px}
        className="rounded-md"
        priority
      />
      {showText && (
        <div>
          <span className={cn('font-mono font-bold tracking-wider', textClassName)}>
            FRX<span className="text-accent">_LABS</span>
          </span>
          {subtitle && (
            <p className="mt-0.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              {subtitle}
            </p>
          )}
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="group block">
        {content}
      </Link>
    );
  }

  return content;
}
