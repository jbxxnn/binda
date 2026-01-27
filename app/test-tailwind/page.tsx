export default function TailwindTestPage() {
    return (
        <div className="p-10 space-y-4">
            <h1 className="text-3xl font-bold text-red-500">Tailwind Test</h1>

            <div className="bg-blue-500 text-white p-4 rounded text-center">
                This should be blue with white text
            </div>

            <div className="h-10 w-10 bg-green-500 rounded-full"></div>
            <p>Above should be a green circle</p>

            <div className="bg-slate-200 p-4 text-slate-800">
                This should be slate-200 background (light grey) with slate-800 text
            </div>
        </div>
    )
}
