import Nav from '@/components/Nav'

export const metadata = { title: 'Disclaimer' }

export default function DisclaimerPage() {
  return (
    <main>
      <Nav />
      <div style={{ paddingTop: '64px', minHeight: '100vh', background: '#000' }}>
        <article style={{ maxWidth: 720, margin: '0 auto', padding: '64px 24px 80px', color: '#D4D4D8', fontSize: 15, lineHeight: 1.8 }}>
          <h1 style={{ color: '#fff', fontSize: 32, fontWeight: 400, marginBottom: 8 }}>Disclaimer</h1>
          <p style={{ color: '#71717A', fontSize: 13, marginBottom: 40 }}>Effective 9 May 2026</p>

          <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 500, marginTop: 40, marginBottom: 12 }}>1. Directory Information</h2>
          <p>BisDak is a community-driven directory of Filipino-owned businesses in New Zealand. Business listings are submitted by users and business owners. While we make reasonable efforts to review submissions, <strong>we do not verify, endorse, or guarantee</strong> the accuracy, completeness, or reliability of any listing information.</p>

          <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 500, marginTop: 40, marginBottom: 12 }}>2. No Endorsement</h2>
          <p>Inclusion of a business in the BisDak directory does not constitute an endorsement, recommendation, or approval by BisDak. We do not vouch for the quality, safety, legality, or suitability of any listed business, product, or service.</p>

          <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 500, marginTop: 40, marginBottom: 12 }}>3. User Reviews</h2>
          <p>Reviews on BisDak are the opinions of individual users and do not represent the views of BisDak. We do not verify the identity of reviewers or the accuracy of their reviews. Businesses may respond to reviews, and those responses are their own.</p>

          <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 500, marginTop: 40, marginBottom: 12 }}>4. Your Responsibility</h2>
          <p>You are responsible for conducting your own due diligence before engaging with any business listed on BisDak. This includes verifying business registrations, licences, qualifications, and insurance where applicable.</p>

          <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 500, marginTop: 40, marginBottom: 12 }}>5. No Professional Advice</h2>
          <p>Nothing on BisDak constitutes professional, legal, financial, or medical advice. If you need professional advice, consult a qualified professional directly.</p>

          <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 500, marginTop: 40, marginBottom: 12 }}>6. Third-Party Links</h2>
          <p>Business listings may contain links to external websites. We are not responsible for the content, privacy practices, or availability of third-party websites.</p>

          <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 500, marginTop: 40, marginBottom: 12 }}>7. Limitation of Liability</h2>
          <p>To the maximum extent permitted by New Zealand law, BisDak is not liable for any loss, damage, or expense arising from your use of the directory or your dealings with any listed business. Nothing in this disclaimer limits any rights you have under the Consumer Guarantees Act 1993 that cannot be lawfully excluded.</p>

          <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 500, marginTop: 40, marginBottom: 12 }}>8. Reporting Inaccuracies</h2>
          <p>If you find inaccurate or misleading information on BisDak, please contact us at <strong>alex@aiconsult.co.nz</strong> so we can investigate and correct it.</p>

          <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 500, marginTop: 40, marginBottom: 12 }}>9. Fair Trading Act</h2>
          <p>BisDak complies with the Fair Trading Act 1986. We do not make false or misleading representations about listed businesses. Business owners are solely responsible for the accuracy of the information they submit.</p>
        </article>
      </div>
    </main>
  )
}
