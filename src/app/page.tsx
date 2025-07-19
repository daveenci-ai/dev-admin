export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md mx-auto text-center p-8 bg-white rounded-lg shadow-lg">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          🎉 Dev Admin Dashboard
        </h1>
        <p className="text-gray-600 mb-6">
          Welcome to your admin dashboard! The full system is being deployed.
        </p>
        <div className="space-y-4 text-sm text-gray-500">
          <div>✅ Authentication System</div>
          <div>✅ CRM Management</div>
          <div>✅ Blog System</div>
          <div>✅ Avatar Generator</div>
          <div>✅ Chatbot Logs</div>
          <div>✅ Smart Assistant</div>
          <div>✅ Email Management</div>
        </div>
        <p className="mt-6 text-xs text-gray-400">
          Basic deployment successful! Full features coming soon...
        </p>
      </div>
    </div>
  )
} 