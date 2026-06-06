import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="prose prose-lg max-w-none text-foreground">
            <h1 className="text-4xl font-bold text-center mb-8 text-primary">Privacy Policy for Brightminds</h1>
            <p className="text-center text-muted-foreground mb-12">*Last updated: March 11, 2026*</p>
            
            <p className="mb-8">
              Brightminds Labs ("we", "our", "us") operates the Brightminds mobile application ("App"), which provides educational content for students. This Privacy Policy explains what information we collect, how we use it, and your rights regarding your data.
            </p>
            
            <p className="mb-8">
              By using the Brightminds app, you agree to the collection and use of information in accordance with this policy.
            </p>
            
            <hr className="my-12 border-primary/20" />
            
            <h2 className="text-3xl font-semibold mb-6 text-primary">1. Information We Collect</h2>
            <p className="mb-4">We may collect the following types of information:</p>
            
            <h3 className="text-2xl font-medium mb-4 text-primary">Account Data</h3>
            <ul className="list-disc pl-6 mb-6">
              <li>Name</li>
              <li>Email address</li>
              <li>User ID</li>
            </ul>
            
            <h3 className="text-2xl font-medium mb-4 text-primary">Authentication Data</h3>
            <ul className="list-disc pl-6 mb-6">
              <li>Sign-in metadata from Firebase Authentication or Google Sign-In.</li>
            </ul>
            
            <h3 className="text-2xl font-medium mb-4 text-primary">Subscription and Purchase Data</h3>
            <ul className="list-disc pl-6 mb-6">
              <li>Subscription status</li>
              <li>Product IDs</li>
              <li>Transaction metadata processed via app stores and RevenueCat.</li>
            </ul>
            
            <p className="mb-4 font-semibold">We <em>do not collect or store your payment card details</em>. All payments are processed securely by the app stores.</p>
            
            <h3 className="text-2xl font-medium mb-4 text-primary">App Usage Data</h3>
            <ul className="list-disc pl-6 mb-6">
              <li>App events</li>
              <li>Feature usage</li>
              <li>Diagnostics and performance data.</li>
            </ul>
            
            <h3 className="text-2xl font-medium mb-4 text-primary">Device and Technical Data</h3>
            <ul className="list-disc pl-6 mb-6">
              <li>Device model</li>
              <li>Operating system version</li>
              <li>App version</li>
              <li>IP-derived region</li>
              <li>Crash logs</li>
            </ul>
            
            <h2 className="text-3xl font-semibold mb-6 text-primary">2. How We Use Your Data</h2>
            <p className="mb-4">We use collected data to:</p>
            <ul className="list-disc pl-6 mb-8">
              <li>Create and manage user accounts</li>
              <li>Provide access to purchased educational content</li>
              <li>Sync subscription and entitlement status</li>
              <li>Improve app performance and user experience</li>
              <li>Detect abuse, fraud, and policy violations</li>
              <li>Respond to support requests</li>
              <li>Comply with legal obligations</li>
            </ul>
            
            <h2 className="text-3xl font-semibold mb-6 text-primary">3. Legal Basis (Where Applicable)</h2>
            <p className="mb-4">Depending on your jurisdiction, we process data based on:</p>
            <ul className="list-disc pl-6 mb-8">
              <li>Contractual necessity (to provide the services you request)</li>
              <li>Legitimate interests (security, service improvement)</li>
              <li>Consent (where required)</li>
              <li>Legal compliance obligations</li>
            </ul>
            
            <h2 className="text-3xl font-semibold mb-6 text-primary">4. Data Sharing</h2>
            <p className="mb-4 font-semibold">We <em>do not sell personal data</em>.</p>
            <p className="mb-4">We may share limited data with trusted service providers necessary to operate the app, including:</p>
            <ul className="list-disc pl-6 mb-6">
              <li>Firebase (authentication, analytics, crash reporting)</li>
              <li>Supabase (database and backend infrastructure)</li>
              <li>RevenueCat (subscription and entitlement management)</li>
              <li>Google Play Store (Android billing services)</li>
              <li>Apple App Store (iOS billing services)</li>
            </ul>
            <p className="mb-4">These providers process data according to their own privacy policies.</p>
            <p className="mb-6">Relevant privacy policies:</p>
            <ul className="list-disc pl-6 mb-8">
              <li>Firebase: <a href="https://firebase.google.com/support/privacy" className="text-primary hover:underline">https://firebase.google.com/support/privacy</a></li>
              <li>RevenueCat: <a href="https://www.revenuecat.com/privacy" className="text-primary hover:underline">https://www.revenuecat.com/privacy</a></li>
              <li>Google Privacy Policy: <a href="https://policies.google.com/privacy" className="text-primary hover:underline">https://policies.google.com/privacy</a></li>
            </ul>
            <p className="mb-8">We may also disclose data if required by law, regulation, or legal process.</p>
            
            <h2 className="text-3xl font-semibold mb-6 text-primary">5. Data Retention</h2>
            <p className="mb-4">We retain personal data only for as long as necessary to:</p>
            <ul className="list-disc pl-6 mb-8">
              <li>Provide our services</li>
              <li>Maintain legal, accounting, or security records</li>
              <li>Resolve disputes</li>
              <li>Enforce agreements</li>
            </ul>
            <p className="mb-8">When data is no longer required, it may be securely deleted or anonymized.</p>
            
            <h2 className="text-3xl font-semibold mb-6 text-primary">6. Security</h2>
            <p className="mb-4">We use reasonable technical and organizational safeguards to protect your data, including:</p>
            <ul className="list-disc pl-6 mb-8">
              <li>Encrypted communication (HTTPS / TLS)</li>
              <li>Access controls</li>
              <li>Logging and monitoring systems</li>
            </ul>
            <p className="mb-8">However, no transmission or storage system is completely secure, and absolute security cannot be guaranteed.</p>
            
            <h2 className="text-3xl font-semibold mb-6 text-primary">7. Children's Privacy</h2>
            <p className="mb-4">Brightminds is designed for educational use by students. If your jurisdiction requires parental or guardian consent for minors, parents or guardians should supervise app usage.</p>
            <p className="mb-8">If you believe a child has provided personal information without appropriate consent, please contact us and we will take appropriate action.</p>
            
            <h2 className="text-3xl font-semibold mb-6 text-primary">8. Your Rights</h2>
            <p className="mb-4">Depending on your location, you may have rights to:</p>
            <ul className="list-disc pl-6 mb-8">
              <li>Access your personal data</li>
              <li>Correct inaccurate data</li>
              <li>Delete your account or personal data</li>
              <li>Export your data</li>
              <li>Restrict or object to certain processing</li>
            </ul>
            <p className="mb-8">To request these actions, contact us using the details below.</p>
            
            <h2 className="text-3xl font-semibold mb-6 text-primary">9. International Data Transfers</h2>
            <p className="mb-8">Your data may be processed in countries other than your own. Where required by law, we apply appropriate safeguards for international data transfers.</p>
            
            <h2 className="text-3xl font-semibold mb-6 text-primary">10. Changes to This Privacy Policy</h2>
            <p className="mb-8">We may update this Privacy Policy periodically. When changes occur, the updated version will be posted on this page with a revised <em>Last Updated</em> date.</p>
            
            <h2 className="text-3xl font-semibold mb-6 text-primary">11. Contact Us</h2>
            <p className="mb-4">If you have questions about this Privacy Policy or data practices, please contact us:</p>
            <ul className="list-disc pl-6 mb-4">
              <li><strong>Email:</strong> <a href="mailto:hello@brightmindsclasses.in" className="text-primary hover:underline">hello@brightmindsclasses.in</a></li>
              <li><strong>Support:</strong> <a href="mailto:hello@brightmindsclasses.in" className="text-primary hover:underline">hello@brightmindsclasses.in</a></li>
            </ul>
            <ul className="list-disc pl-6 mb-8">
              <li><strong>Company:</strong> Brightminds</li>
              <li><strong>Location:</strong> Ahilyanagar, Maharashtra, India</li>
            </ul>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default PrivacyPolicy;