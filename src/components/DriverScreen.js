export default function DriverScreen({ usuario }) {
  return (
    <div className="p-4">
      <h2 className="text-2xl">¡Hola conductor {usuario.displayName}!</h2>
      {/* Trip publishing form goes here */}
    </div>
  );
}
