import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const TermsOfUse = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="prose prose-lg max-w-none text-foreground">
            <h1 className="text-4xl font-bold text-center mb-8 text-primary">Terms of Use</h1>
            <p className="text-center text-muted-foreground mb-12">*Last updated: May 2026*</p>
            
            <hr className="my-12 border-primary/20" />
            
            <h2 className="text-3xl font-semibold mb-6 text-primary">1. Acceptance of Terms</h2>
            <p className="mb-8">
              By accessing or using Brightminds Classes, you agree to be bound by these Terms of Use. If you do not agree to these terms, please do not use our application.
            </p>
            
            <h2 className="text-3xl font-semibold mb-6 text-primary">2. Description of Service</h2>
            <p className="mb-8">
              Brightminds Classes provides educational content including illustrative notes for students in Classes 7-10 (NCERT/CBSE curriculum) and competitive exam preparation content including NDA and other entrance examinations.
            </p>
            
            <h2 className="text-3xl font-semibold mb-6 text-primary">3. User Accounts</h2>
            <p className="mb-8">
              You must create an account to access our services. You are responsible for maintaining the confidentiality of your account credentials and for all activities under your account.
            </p>
            
            <h2 className="text-3xl font-semibold mb-6 text-primary">4. Content Usage</h2>
            <ul className="list-disc pl-6 mb-8">
              <li className="mb-3">All content provided is for personal educational use only</li>
              <li className="mb-3">You may not share, redistribute, or resell any purchased content</li>
              <li className="mb-3">Copying, downloading, or screenshotting content is prohibited</li>
              <li className="mb-3">Each subscription is linked to a single user account</li>
            </ul>
            
            <h2 className="text-3xl font-semibold mb-6 text-primary">5. Subscriptions and Payments</h2>
            <ul className="list-disc pl-6 mb-8">
              <li className="mb-3">Brightminds Classes offers auto-renewing subscriptions for class access</li>
              <li className="mb-3">Subscription titles, lengths, and prices are clearly displayed before purchase</li>
              <li className="mb-3">Subscriptions renew automatically unless cancelled before the renewal date</li>
              <li className="mb-3">You can manage or cancel subscriptions through your Google Play or Apple App Store account settings</li>
              <li className="mb-3">Access continues until the end of the paid billing period after cancellation</li>
              <li className="mb-3">Subscription access cannot be transferred to another account</li>
              <li className="mb-3">Use "Restore Purchases" to recover active subscriptions on a new device</li>
            </ul>
            
            <h2 className="text-3xl font-semibold mb-6 text-primary">6. Auto-Renewal Information</h2>
            <p className="mb-8">
              Brightminds Classes subscriptions automatically renew at the end of each billing period. Your payment method will be charged within 24 hours prior to the end of the current period. You can turn off auto-renewal at any time in your device's account settings. No refunds are provided for the unused portion of a subscription term.
            </p>
            
            <h2 className="text-3xl font-semibold mb-6 text-primary">7. Intellectual Property</h2>
            <p className="mb-8">
              All content, including text, graphics, and illustrations, is the property of Brightminds Classes and is protected by copyright laws. Unauthorized use is strictly prohibited.
            </p>
            
            <h2 className="text-3xl font-semibold mb-6 text-primary">8. Prohibited Activities</h2>
            <ul className="list-disc pl-6 mb-8">
              <li className="mb-3">Sharing login credentials with others</li>
              <li className="mb-3">Attempting to circumvent content protection measures</li>
              <li className="mb-3">Using automated systems to access content</li>
              <li className="mb-3">Reverse engineering the application</li>
            </ul>
            
            <h2 className="text-3xl font-semibold mb-6 text-primary">9. Termination</h2>
            <p className="mb-8">
              We reserve the right to terminate or suspend your account for violations of these terms without prior notice.
            </p>
            
            <h2 className="text-3xl font-semibold mb-6 text-primary">10. Privacy Policy</h2>
            <p className="mb-8">
              Your use of Brightminds Classes is also governed by our <a href="/privacy-policy" className="text-primary hover:underline">Privacy Policy</a>, which is incorporated into these Terms of Use by reference.
            </p>
            
            <h2 className="text-3xl font-semibold mb-6 text-primary">11. Governing Law</h2>
            <p className="mb-8">
              These Terms of Use shall be governed by and construed in accordance with the laws of India.
            </p>
            
            <h2 className="text-3xl font-semibold mb-6 text-primary">12. Contact Us</h2>
            <p className="mb-4">
              For questions about these Terms of Use, please contact us at:
            </p>
            <ul className="list-disc pl-6 mb-8">
              <li className="mb-3"><strong>Email:</strong> <a href="mailto:hello@brightmindsclasses.in" className="text-primary hover:underline">hello@brightmindsclasses.in</a></li>
              <li className="mb-3"><strong>Website:</strong> <a href="https://brightmindsclasses.in/#contact" className="text-primary hover:underline">https://brightmindsclasses.in/#contact</a></li>
            </ul>
            
            <hr className="my-12 border-primary/20" />
            <p className="text-center text-muted-foreground">© 2026 Brightmind Labs. All rights reserved.</p>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default TermsOfUse;
