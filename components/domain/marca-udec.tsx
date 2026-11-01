import Image from "next/image";

export function MarcaUdec({ className }: { className: string }) {
  return (
    <Image
      src="/assets/logo-inicio.png"
      alt="Universidad de Cundinamarca"
      width={390}
      height={80}
      priority
      className={className}
    />
  );
}
