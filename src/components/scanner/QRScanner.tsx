// components/scanner/QRScanner.tsx

import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Camera, X } from "lucide-react";
import jsQR from "jsqr";

interface QRScannerProps {
  onScan: (data: string) => void;
  onClose: () => void;
}

export default function QRScanner({ onScan, onClose }: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "environment" } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setScanning(true);
      }
    } catch (err) {
      setError("No se pudo acceder a la cámara. Asegurate de dar permisos.");
      console.error(err);
    }
  };

  const stopCamera = () => {
    const video = videoRef.current;
    if (video?.srcObject) {
      const stream = video.srcObject as MediaStream;
      stream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
    }
  };

  useEffect(() => {
    if (!scanning) return;
    
    const interval = setInterval(() => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0);
        
        try {
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          
          if (code) {
            onScan(code.data);
            setScanning(false);
          }
        } catch (err) {
          console.error("Error scanning QR:", err);
        }
      }
    }, 100);

    return () => clearInterval(interval);
  }, [scanning, onScan]);



  return (
    <div className="fixed inset-0 bg-black/95 z-50 flex flex-col">
      <div className="flex items-center justify-between p-4">
        <h3 className="text-white font-semibold">Escaneá el código QR</h3>
        <Button onClick={onClose} variant="ghost" size="icon" className="text-white">
          <X className="w-5 h-5" />
        </Button>
      </div>
      
      <div className="flex-1 flex items-center justify-center p-4">
        {error ? (
          <div className="text-center">
            <Camera className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <p className="text-red-400">{error}</p>
          </div>
        ) : (
          <div className="relative">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="max-w-full max-h-[70vh] rounded-xl"
            />
            <canvas ref={canvasRef} className="hidden" />
            <div className="absolute inset-0 border-4 border-violet-500 rounded-xl pointer-events-none">
              <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white"></div>
              <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white"></div>
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white"></div>
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white"></div>
            </div>
          </div>
        )}
      </div>
      
      <p className="text-center text-slate-400 text-sm pb-6 px-4">
        Posicioná el código QR frente a la cámara
      </p>
    </div>
  );
}