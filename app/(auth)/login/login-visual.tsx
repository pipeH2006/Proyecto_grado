import Image from "next/image";

const fotos = [
  {
    src: "/assets/login/estudiante-1.jpg",
    className: "left-[16%] top-[10%] h-24 w-24 sm:h-28 sm:w-28",
  },
  {
    src: "/assets/login/estudiante-2.jpg",
    className: "right-[14%] top-0 h-24 w-24 sm:h-28 sm:w-28",
  },
  {
    src: "/assets/login/estudiante-3.jpg",
    className: "right-[38%] top-[34%] h-20 w-20 sm:h-24 sm:w-24",
  },
  {
    src: "/assets/login/estudiante-4.jpg",
    className: "right-[2%] top-[62%] h-24 w-24 sm:h-28 sm:w-28",
  },
  {
    src: "/assets/login/estudiante-5.jpg",
    className: "bottom-[17%] left-[34%] h-14 w-14 sm:h-16 sm:w-16",
  },
  {
    src: "/assets/login/estudiante-6.jpg",
    className: "bottom-[4%] left-[8%] h-14 w-14 sm:h-16 sm:w-16",
  },
  {
    src: "/assets/login/estudiante-7.jpg",
    className: "bottom-[13%] right-[22%] h-16 w-16 sm:h-20 sm:w-20",
  },
];

export function LoginVisual() {
  return (
    <aside
      aria-label="Inspiración institucional"
      className="relative isolate mt-4 flex min-h-[25rem] items-center overflow-hidden rounded-[1.5rem] bg-udec-primary px-6 py-12 sm:px-10 lg:mt-0 lg:min-h-[calc(100dvh-2.5rem)] lg:px-12 xl:px-16"
    >
      <Image
        src="/assets/login/bg-login.png"
        alt=""
        fill
        sizes="(min-width: 1024px) 48vw, 100vw"
        className="-z-10 object-cover"
        aria-hidden="true"
      />
      {fotos.map((foto) => (
        <Image
          key={foto.src}
          src={foto.src}
          alt=""
          aria-hidden="true"
          width={160}
          height={160}
          sizes="(min-width: 1024px) 12vw, 24vw"
          className={`absolute z-0 rounded-full object-cover ${foto.className}`}
        />
      ))}
      <h2 className="relative z-10 max-w-[78%] text-3xl font-bold leading-tight text-white sm:text-4xl xl:text-5xl">
        Cada inicio de sesión es un paso más hacia tus metas
      </h2>
    </aside>
  );
}
