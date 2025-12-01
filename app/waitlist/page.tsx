export default function WaitlistPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2 bg-gray-100">
      <h1 className="text-4xl font-bold mb-6">Join the Waitlist</h1>
      <p className="text-lg mb-4">We're excited to have you! Sign up to be the first to know when we launch.</p>
      <form className="w-full max-w-sm">
        <div className="mb-4">
          <input
            type="email"
            placeholder="Enter your email"
            className="w-full px-3 py-2 border rounded"
          />
        </div>    
        <button
            type="submit"
            className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600"
            >
            Join Waitlist
        </button>
      </form>
    </div>
  )
}