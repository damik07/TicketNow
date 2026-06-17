// src/app/api/music/search/route.ts
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");

  if (!query) {
    return NextResponse.json({ error: "Falta el parámetro de búsqueda (q)" }, { status: 400 });
  }

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    console.error("Falta configurar YOUTUBE_API_KEY en las variables de entorno.");
    return NextResponse.json({ error: "Error de configuración del servidor" }, { status: 500 });
  }

  try {
    // Llamada oficial a la API de YouTube v3 para buscar videos
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=5&q=${encodeURIComponent(
      query
    )}&type=video&key=${apiKey}`;

    const res = await fetch(url);
    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error?.message || "Error al consultar a YouTube");
    }

    const data = await res.json();

    // Mapeamos la respuesta para devolver solo lo que el frontend necesita
    const videos = data.items.map((item: any) => ({
      id: item.id.videoId,
      title: item.snippet.title,
      artist: item.snippet.channelTitle,
      thumbnail: item.snippet.thumbnails?.default?.url || "",
    }));

    return NextResponse.json({ videos });
  } catch (error: any) {
    console.error("Error en YouTube Search API:", error);
    return NextResponse.json({ error: error.message || "Error interno" }, { status: 500 });
  }
}