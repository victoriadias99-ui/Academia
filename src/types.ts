export interface PdfArchivo {
  id: string;
  nombre: string;
  pdf_url: string;
}

export interface PdfModulo {
  id: string;
  titulo: string;
  orden: number;
  pdfs: PdfArchivo[];
  pdf_url?: string;
}

export interface PdfCourse {
  id: number;
  nombre: string;
  descripcion?: string;
  imagen_url?: string;
  slug: string;
  activo: boolean;
  modulos: PdfModulo[];
}
