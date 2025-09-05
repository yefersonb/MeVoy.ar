export default function PantallaConductores({ usuario }) {
  return (
    <div className="p-4">
      <h2 className="text-2xl">¡Hola conductor {usuario.displayName}!</h2>
      {/* Aquí va el formulario de publicación de viajes */}
    </div>
  );
}
