import { Metadata } from 'next';
import { app } from '@/lib/config';

export const metadata: Metadata = {
  title: 'Privacy Policy',
};

export default function PrivacyPage() {
  return (
    <div className="container-page">
      <div className="max-w-3xl mx-auto prose prose-gray">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Privacy Policy</h1>

        <p className="text-sm text-gray-500 mb-8">Last updated: {new Date().toLocaleDateString()}</p>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">1. Introduction</h2>
          <p className="text-gray-600">
            This Privacy Policy describes how {app.name} collects, uses, and protects your
            information when you use our service.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">2. Information We Collect</h2>
          <p className="text-gray-600 mb-4">We collect minimal information necessary to provide our service:</p>
          <ul className="list-disc pl-5 text-gray-600 space-y-2">
            <li>
              <strong>Wallet Address:</strong> Your public wallet address when you connect to the
              app
            </li>
            <li>
              <strong>Analytics Data:</strong> Anonymous usage data to improve the service (no
              cookies)
            </li>
            <li>
              <strong>Transaction Data:</strong> On-chain transaction data (publicly visible on the
              blockchain)
            </li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">3. How We Use Information</h2>
          <p className="text-gray-600 mb-4">We use collected information to:</p>
          <ul className="list-disc pl-5 text-gray-600 space-y-2">
            <li>Provide and maintain our service</li>
            <li>Improve user experience</li>
            <li>Monitor usage patterns (anonymously)</li>
            <li>Detect and prevent abuse</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">4. Cookie-Free Analytics</h2>
          <p className="text-gray-600">
            We use cookie-free analytics to understand how users interact with our service. This
            data is anonymized and cannot be used to identify individual users.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">5. Data Sharing</h2>
          <p className="text-gray-600">
            We do not sell your personal information. We may share data with:
          </p>
          <ul className="list-disc pl-5 text-gray-600 space-y-2 mt-2">
            <li>Service providers who assist in operating our service</li>
            <li>Legal authorities when required by law</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">6. Blockchain Data</h2>
          <p className="text-gray-600">
            Please be aware that blockchain transactions are public and permanent. Any information
            you submit to the blockchain cannot be deleted or modified.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">7. Data Security</h2>
          <p className="text-gray-600">
            We implement appropriate security measures to protect your information. However, no
            method of transmission over the Internet is 100% secure.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">8. Your Rights</h2>
          <p className="text-gray-600 mb-4">You have the right to:</p>
          <ul className="list-disc pl-5 text-gray-600 space-y-2">
            <li>Access your personal information</li>
            <li>Request deletion of your data (where applicable)</li>
            <li>Opt out of analytics tracking</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">9. Changes to This Policy</h2>
          <p className="text-gray-600">
            We may update this Privacy Policy from time to time. We will notify you of any changes
            by posting the new policy on this page.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">10. Contact</h2>
          <p className="text-gray-600">
            If you have any questions about this Privacy Policy, please contact us.
          </p>
        </section>
      </div>
    </div>
  );
}
