import StreamerForm from '../StreamerForm';

export default function AdminStreamerNewPage() {
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-semibold">Tambah Streamer</h1>
      <StreamerForm />
    </div>
  );
}
