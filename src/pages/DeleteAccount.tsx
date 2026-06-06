import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const DeleteAccount = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="prose prose-lg max-w-none text-foreground">
            <h1 className="text-4xl font-bold text-center mb-8 text-primary">Delete Your Account</h1>
            
            <p className="mb-8">
              You can request deletion of your BrightMinds account and all associated data by following the steps below or by emailing us directly.
            </p>

            <hr className="my-12 border-primary/20" />

            <h2 className="text-3xl font-semibold mb-6 text-primary">Option 1 — Delete from the app</h2>
            <ol className="list-decimal pl-6 mb-8 space-y-2">
              <li>Open the BrightMinds app on your device</li>
              <li>Tap Profile (bottom navigation bar)</li>
              <li>Scroll down to the Account section</li>
              <li>Tap "Delete Account"</li>
              <li>Confirm the deletion when prompted</li>
            </ol>

            <h2 className="text-3xl font-semibold mb-6 text-primary">Option 2 — Email us</h2>
            <p className="mb-4">Send an email to <a href="mailto:hello@brightminds.in" className="text-primary hover:underline">hello@brightminds.in</a> with the subject line "Account Deletion Request" and include:</p>
            <ul className="list-disc pl-6 mb-8">
              <li>The email address linked to your account</li>
              <li>Your request to delete the account</li>
            </ul>
            <p className="mb-8">We will process your request within 7 business days and send you a confirmation.</p>

            <hr className="my-12 border-primary/20" />

            <h2 className="text-3xl font-semibold mb-6 text-primary">What data is deleted</h2>
            
            <div className="overflow-x-auto mb-8">
              <table className="w-full border-collapse border border-primary/20">
                <thead>
                  <tr className="bg-primary/5">
                    <th className="border border-primary/20 px-4 py-3 text-left font-semibold text-primary">Data type</th>
                    <th className="border border-primary/20 px-4 py-3 text-left font-semibold text-primary">Action</th>
                    <th className="border border-primary/20 px-4 py-3 text-left font-semibold text-primary">Retention</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="hover:bg-primary/5 transition-colors">
                    <td className="border border-primary/20 px-4 py-3">Account credentials (email, password)</td>
                    <td className="border border-primary/20 px-4 py-3">Deleted</td>
                    <td className="border border-primary/20 px-4 py-3">Immediately</td>
                  </tr>
                  <tr className="hover:bg-primary/5 transition-colors">
                    <td className="border border-primary/20 px-4 py-3">Profile (name, class selection)</td>
                    <td className="border border-primary/20 px-4 py-3">Deleted</td>
                    <td className="border border-primary/20 px-4 py-3">Immediately</td>
                  </tr>
                  <tr className="hover:bg-primary/5 transition-colors">
                    <td className="border border-primary/20 px-4 py-3">Subscription records</td>
                    <td className="border border-primary/20 px-4 py-3">Deleted</td>
                    <td className="border border-primary/20 px-4 py-3">Immediately</td>
                  </tr>
                  <tr className="hover:bg-primary/5 transition-colors">
                    <td className="border border-primary/20 px-4 py-3">Content access history</td>
                    <td className="border border-primary/20 px-4 py-3">Deleted</td>
                    <td className="border border-primary/20 px-4 py-3">Immediately</td>
                  </tr>
                  <tr className="hover:bg-primary/5 transition-colors">
                    <td className="border border-primary/20 px-4 py-3">Transaction / payment records</td>
                    <td className="border border-primary/20 px-4 py-3">Retained</td>
                    <td className="border border-primary/20 px-4 py-3">7 years (legal requirement)</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <hr className="my-12 border-primary/20" />

            <h2 className="text-3xl font-semibold mb-6 text-primary">Questions?</h2>
            <p>
              Contact us at <a href="mailto:hello@brightminds.in" className="text-primary hover:underline">hello@brightminds.in</a>
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default DeleteAccount;
