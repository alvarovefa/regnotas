import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Camera as CameraIcon, Check, RefreshCw } from 'lucide-react';

interface CameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (file: File) => void;
}

export default function CameraModal({ isOpen, onClose, onCapture }: CameraModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [error, setError] = useState<string>('');

  const startCamera = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 640 } }
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setError('');
    } catch (err) {
      console.error(err);
      setError('No se pudo acceder a la cámara. Revisa los permisos de tu navegador.');
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  }, [stream]);

  const handleClose = () => {
    stopCamera();
    setPhoto(null);
    setError('');
    onClose();
  };

  const takePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      const size = Math.min(video.videoWidth, video.videoHeight);
      canvas.width = size;
      canvas.height = size;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Calculate crop to make it square
        const startX = (video.videoWidth - size) / 2;
        const startY = (video.videoHeight - size) / 2;
        
        // Mirror the image on canvas since video is mirrored
        ctx.translate(size, 0);
        ctx.scale(-1, 1);
        
        ctx.drawImage(video, startX, startY, size, size, 0, 0, size, size);
        
        // Reset transform
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        setPhoto(dataUrl);
        stopCamera();
      }
    }
  };

  const retakePhoto = () => {
    setPhoto(null);
    startCamera();
  };

  const confirmPhoto = () => {
    if (photo && canvasRef.current) {
      canvasRef.current.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], 'profile.jpg', { type: 'image/jpeg' });
          onCapture(file);
          handleClose();
        }
      }, 'image/jpeg', 0.9);
    }
  };

  return (
    <AnimatePresence onExitComplete={stopCamera}>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            onAnimationComplete={() => { if (!photo) startCamera(); }}
            className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl relative overflow-hidden"
          >
            <button 
              onClick={handleClose}
              className="absolute top-4 right-4 p-2 bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800 rounded-full transition-colors z-10"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="text-center mb-6 mt-2">
              <h3 className="text-xl font-bold text-slate-800">Foto de Perfil</h3>
              <p className="text-slate-500 text-sm mt-1">Asegúrate de tener buena iluminación</p>
            </div>

            {error ? (
              <div className="bg-rose-50 text-rose-600 p-4 rounded-2xl text-sm text-center mb-6">
                {error}
                <button onClick={startCamera} className="mt-3 w-full py-2 bg-rose-100 font-bold rounded-xl hover:bg-rose-200 transition-colors">
                  Reintentar
                </button>
              </div>
            ) : (
              <div className="relative aspect-square w-full max-w-[300px] mx-auto bg-slate-100 rounded-full overflow-hidden mb-6 border-4 border-slate-50 shadow-inner">
                {photo ? (
                  <img src={photo} alt="Vista previa" className="w-full h-full object-cover" />
                ) : (
                  <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    muted
                    className="w-full h-full object-cover transform -scale-x-100" 
                  />
                )}
                <canvas ref={canvasRef} className="hidden" />
              </div>
            )}

            {!error && (
              <div className="flex gap-3 justify-center">
                {photo ? (
                  <>
                    <button 
                      onClick={retakePhoto}
                      className="flex-1 flex items-center justify-center gap-2 py-3 bg-slate-100 text-slate-700 font-bold rounded-2xl hover:bg-slate-200 transition-colors"
                    >
                      <RefreshCw className="w-5 h-5" /> Repetir
                    </button>
                    <button 
                      onClick={confirmPhoto}
                      className="flex-1 flex items-center justify-center gap-2 py-3 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/20"
                    >
                      <Check className="w-5 h-5" /> Usar foto
                    </button>
                  </>
                ) : (
                  <button 
                    onClick={takePhoto}
                    disabled={!stream}
                    className="w-20 h-20 bg-indigo-600 rounded-full flex items-center justify-center text-white hover:bg-indigo-700 hover:scale-105 transition-all shadow-xl shadow-indigo-600/30 disabled:opacity-50 disabled:hover:scale-100"
                  >
                    <CameraIcon className="w-8 h-8" />
                  </button>
                )}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
