import { Metadata } from 'next';
import { app } from '@/lib/config';

export const metadata: Metadata = {
  title: 'Terms of Service',
};

export default function TermsPage() {
  return (
    <div className="container-page">
      <div className="max-w-3xl mx-auto prose prose-gray">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Terms of Service</h1>

        <p className="text-sm text-gray-500 mb-8">Last updated: {new Date().toLocaleDateString()}</p>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">1. Acceptance of Terms</h2>
          <p className="text-gray-600">
            By accessing or using {app.name}, you agree to be bound by these Terms of Service. If
            you do not agree to these terms, please do not use our service.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">2. Description of Service</h2>
          <p className="text-gray-600">
            {app.name} is a decentralized application that allows users to interact with blockchain
            networks. The service is provided &quot;as is&quot; without any warranties.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">3. User Responsibilities</h2>
          <ul className="list-disc pl-5 text-gray-600 space-y-2">
            <li>You are responsible for maintaining the security of your wallet</li>
            <li>You are responsible for all activities that occur under your account</li>
            <li>You must not use the service for any illegal activities</li>
            <li>You understand that cryptocurrency transactions are irreversible</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">4. Risks</h2>
          <p className="text-gray-600">
            You acknowledge and accept that there are risks associated with using cryptocurrency and
            blockchain technology, including but not limited to:
          </p>
          <ul className="list-disc pl-5 text-gray-600 space-y-2 mt-2">
            <li>Volatility of cryptocurrency prices</li>
            <li>Potential loss of funds due to user error</li>
            <li>Smart contract vulnerabilities</li>
            <li>Regulatory changes</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">5. Disclaimer</h2>
          <p className="text-gray-600">
            This service does not provide financial, investment, or legal advice. You should consult
            with appropriate professionals before making any financial decisions.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">6. Limitation of Liability</h2>
          <p className="text-gray-600">
            To the maximum extent permitted by law, we shall not be liable for any indirect,
            incidental, special, consequential, or punitive damages arising out of or relating to
            your use of the service.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">7. Changes to Terms</h2>
          <p className="text-gray-600">
            We reserve the right to modify these terms at any time. Continued use of the service
            after any changes constitutes acceptance of the new terms.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">8. Contact</h2>
          <p className="text-gray-600">
            If you have any questions about these Terms of Service, please contact us.
          </p>
        </section>
      </div>
    </div>
  );
}
