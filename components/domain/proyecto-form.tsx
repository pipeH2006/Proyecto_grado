"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { crearProyecto } from "@/actions/proyectos";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { queryKeys } from "@/lib/queryKeys";
import { cn } from "@/lib/utils";
import {
  contarPalabras,
  crearProyectoSchema,
  MAX_PALABRAS_RESUMEN,
  type CrearProyectoInput,
} from "@/lib/validations/proyecto";

type Programa = { id: number; nombre: string; facultad: string | null };
type Sede = { id: number; nombre: string };
type OfertaSede = { programa_id: number; sede_id: number };
type Modalidad = { id: number; nombre: string };
type Periodo = { id: number; anio: number; semestre: number };

const SIN_FACULTAD = "Sin facultad";

export function ProyectoForm({
  programas,
  sedes = [],
  programaSede = [],
  modalidades,
  periodos,
}: {
  programas: Programa[];
  sedes?: Sede[];
  programaSede?: OfertaSede[];
  modalidades: Modalidad[];
  periodos: Periodo[];
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [palabras, setPalabras] = useState("");

  const programasPorSede = useMemo(() => {
    const mapa = new Map<number, number[]>();
    for (const oferta of programaSede) {
      const lista = mapa.get(oferta.sede_id) ?? [];
      lista.push(oferta.programa_id);
      mapa.set(oferta.sede_id, lista);
    }
    return mapa;
  }, [programaSede]);

  function programasEnSede(sedeId: number | undefined): Programa[] {
    if (!sedeId) return [];
    const ids = new Set(programasPorSede.get(sedeId) ?? []);
    return programas.filter((programa) => ids.has(programa.id));
  }

  function facultadesEnSede(sedeId: number | undefined): string[] {
    const unicas = new Set(
      programasEnSede(sedeId).map(
        (programa) => programa.facultad ?? SIN_FACULTAD,
      ),
    );
    return [...unicas].sort((a, b) => a.localeCompare(b, "es"));
  }

  function programasEnSedeYFacultad(
    sedeId: number | undefined,
    facultad: string,
  ): Programa[] {
    return programasEnSede(sedeId).filter(
      (programa) => (programa.facultad ?? SIN_FACULTAD) === facultad,
    );
  }

  const sedeInicial = sedes[0]?.id ?? 0;
  const programasIniciales = programasEnSede(sedeInicial);
  const facultadInicial = programasIniciales[0]?.facultad ?? SIN_FACULTAD;
  const programaInicial = programasIniciales[0]?.id ?? 0;
  const [facultad, setFacultad] = useState(facultadInicial);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    getValues,
    watch,
    formState: { errors },
  } = useForm<CrearProyectoInput>({
    resolver: zodResolver(crearProyectoSchema),
    defaultValues: {
      titulo: "",
      resumen: "",
      programa_id: programaInicial,
      sede_id: sedeInicial,
      modalidad_id: modalidades[0]?.id ?? 0,
      periodo_id: periodos[0]?.id ?? 0,
    },
  });

  const resumen = watch("resumen") ?? "";
  const palabrasResumen = contarPalabras(resumen);
  const sedeId = watch("sede_id");
  const facultades = facultadesEnSede(sedeId);
  const programasDisponibles = programasEnSedeYFacultad(sedeId, facultad);

  const sedeRegistro = register("sede_id", { valueAsNumber: true });
  const programaRegistro = register("programa_id", { valueAsNumber: true });

  function cambiarSede(event: React.ChangeEvent<HTMLSelectElement>) {
    sedeRegistro.onChange(event);
    const nuevaSede = Number(event.target.value);
    const disponibles = programasEnSede(nuevaSede);
    const nuevaFacultad = disponibles[0]?.facultad ?? SIN_FACULTAD;
    setFacultad(nuevaFacultad);
    const primerPrograma = disponibles.find(
      (programa) => (programa.facultad ?? SIN_FACULTAD) === nuevaFacultad,
    );
    setValue("programa_id", primerPrograma?.id ?? 0, {
      shouldValidate: true,
    });
  }

  function cambiarFacultad(nuevaFacultad: string) {
    setFacultad(nuevaFacultad);
    const disponibles = programasEnSedeYFacultad(
      getValues("sede_id"),
      nuevaFacultad,
    );
    setValue("programa_id", disponibles[0]?.id ?? 0, {
      shouldValidate: true,
    });
  }

  const mutation = useMutation({
    mutationFn: (values: CrearProyectoInput) => crearProyecto(values),
    onSuccess: (result) => {
      if (result.error) return;
      void queryClient.invalidateQueries({ queryKey: queryKeys.proyectos.all });
      reset();
      setFacultad(facultadInicial);
      setPalabras("");
      router.push("/dashboard/estudiante");
    },
  });

  function onSubmit(values: CrearProyectoInput) {
    mutation.mutate({
      ...values,
      palabras_clave: palabras
        .split(",")
        .map((p) => p.trim())
        .filter(Boolean),
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-xl space-y-5">
      <div className="space-y-2">
        <Label htmlFor="titulo">Titulo</Label>
        <Input id="titulo" {...register("titulo")} />
        {errors.titulo ? (
          <p className="text-sm text-red-600">{errors.titulo.message}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="sede_id">Sede</Label>
        <Select id="sede_id" {...sedeRegistro} onChange={cambiarSede}>
          {sedes.map((sede) => (
            <option key={sede.id} value={sede.id}>
              {sede.nombre}
            </option>
          ))}
        </Select>
        {errors.sede_id ? (
          <p className="text-sm text-red-600">{errors.sede_id.message}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="facultad">Facultad</Label>
        <Select
          id="facultad"
          value={facultad}
          onChange={(event) => cambiarFacultad(event.target.value)}
        >
          {facultades.map((nombreFacultad) => (
            <option key={nombreFacultad} value={nombreFacultad}>
              {nombreFacultad}
            </option>
          ))}
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="programa_id">Programa</Label>
        <Select id="programa_id" {...programaRegistro}>
          {programasDisponibles.map((programa) => (
            <option key={programa.id} value={programa.id}>
              {programa.nombre}
            </option>
          ))}
        </Select>
        {errors.programa_id ? (
          <p className="text-sm text-red-600">{errors.programa_id.message}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="resumen">Resumen</Label>
        <Textarea
          id="resumen"
          rows={5}
          aria-describedby="resumen-contador"
          {...register("resumen")}
        />
        <p
          id="resumen-contador"
          className={cn(
            "text-xs",
            palabrasResumen > MAX_PALABRAS_RESUMEN
              ? "text-red-600"
              : "text-slate-500",
          )}
        >
          {palabrasResumen}/{MAX_PALABRAS_RESUMEN} palabras
        </p>
        {errors.resumen ? (
          <p className="text-sm text-red-600">{errors.resumen.message}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="palabras">Palabras clave</Label>
        <Input
          id="palabras"
          value={palabras}
          onChange={(e) => setPalabras(e.target.value)}
          placeholder="iot, riego, sensores"
        />
        <p className="text-xs text-slate-500">Separadas por coma.</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="modalidad_id">Modalidad</Label>
        <Select
          id="modalidad_id"
          {...register("modalidad_id", { valueAsNumber: true })}
        >
          {modalidades.map((m) => (
            <option key={m.id} value={m.id}>
              {m.nombre}
            </option>
          ))}
        </Select>
        {errors.modalidad_id ? (
          <p className="text-sm text-red-600">{errors.modalidad_id.message}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="periodo_id">Periodo</Label>
        <Select
          id="periodo_id"
          {...register("periodo_id", { valueAsNumber: true })}
        >
          {periodos.map((p) => (
            <option key={p.id} value={p.id}>
              {p.anio}-{p.semestre}
            </option>
          ))}
        </Select>
        {errors.periodo_id ? (
          <p className="text-sm text-red-600">{errors.periodo_id.message}</p>
        ) : null}
      </div>

      {mutation.data?.error ? (
        <p className="text-sm text-red-600">{mutation.data.error.message}</p>
      ) : null}

      <Button type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? "Guardando..." : "Registrar anteproyecto"}
      </Button>
    </form>
  );
}
