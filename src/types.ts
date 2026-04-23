export interface PdfCourse {
  id: number;
  nombre: string;
  descripcion?: string;
  imagen_url?: string;
  slug: string;
  activo: boolean;
  modulos: PdfModulo[];
}

export interface PdfModulo {
  id: string;
  titulo: string;
  pdf_url: string;
  orden: number;
}
