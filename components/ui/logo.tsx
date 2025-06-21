import Image from "next/image";

interface LogoProps {
  width?: number;
  height?: number;
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({
  width = 32,
  height = 32,
  className = "",
}) => {
  return (
    <Image
      src="/logo-placeholder.svg"
      alt="Logo"
      width={width}
      height={height}
      className={className}
    />
  );
};
