import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FaStar } from "react-icons/fa";

export default function RatingModal({ isOpen, onClose, onSubmit }) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");

  const handleSend = () => {
    console.log("Enviando calificación", { rating, comment });
    // Aquí podrías implementar el envío de push por WhatsApp
    onSubmit({ rating, comment });
    setRating(0);
    setComment("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose} className="p-0">
      <DialogContent className="max-w-md rounded-2xl p-6 shadow-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-center">
            Calificá tu viaje
          </DialogTitle>
        </DialogHeader>

        <div className="mt-4 flex justify-center">
          {[...Array(5)].map((_, idx) => {
            const starValue = idx + 1;
            const isActive = starValue <= (hover || rating);
            const starClasses = [
              "cursor-pointer",
              "transition-transform",
              "hover:scale-110",
              isActive ? "text-yellow-400" : "text-gray-300"
            ].join(" ");

            return (
              <FaStar
                key={starValue}
                size={36}
                className={starClasses}
                onClick={() => setRating(starValue)}
                onMouseEnter={() => setHover(starValue)}
                onMouseLeave={() => setHover(0)}
              />
            );
          })}
        </div>

        <textarea
          placeholder="Comentario opcional..."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="w-full mt-4 p-2 border rounded-lg resize-none h-24 focus:outline-none focus:ring"
        />

        <div className="mt-6 flex justify-end space-x-2">
          <Button variant="outline" onClick={onClose} className="rounded-xl">
            Cancelar
          </Button>
          <Button
            onClick={handleSend}
            disabled={rating === 0}
            className="rounded-xl"
          >
            Enviar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
