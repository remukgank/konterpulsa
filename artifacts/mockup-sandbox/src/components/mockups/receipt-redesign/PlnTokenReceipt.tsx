export function PlnTokenReceipt() {
  const tokenGroups = ["12345", "67890", "12345", "67890"];

  return (
    <main className="pln-preview" aria-label="Pratinjau struk token listrik PLN">
      <article className="pln-paper" aria-label="Bukti pembayaran PLN Prabayar">
        <header className="pln-header">
          <div className="pln-brand">
            <span className="pln-mark" aria-hidden="true">K</span>
            <span className="pln-brand-name">Konter<span>Kuota</span></span>
          </div>
          <div className="pln-header-note">
            <span>BUKTI PEMBAYARAN</span>
            <span>LISTRIK PRABAYAR</span>
          </div>
        </header>

        <div className="pln-content">
          <section className="pln-intro">
            <div>
              <div className="pln-eyebrow">PLN · PRABAYAR</div>
              <h1>Token listrik</h1>
              <p>Nominal pembelian <strong>Rp 50.000</strong></p>
            </div>
            <div className="pln-status"><span aria-hidden="true" />Berhasil</div>
          </section>

          <section className="pln-customer" aria-label="Data pelanggan">
            <div className="pln-customer-heading">
              <span className="pln-label">ID PELANGGAN</span>
              <span className="pln-label pln-customer-name-label">PELANGGAN</span>
            </div>
            <div className="pln-customer-values">
              <strong className="pln-meter-id">86007117103</strong>
              <strong className="pln-customer-name">Budi</strong>
            </div>
          </section>

          <section className="pln-token-panel" aria-label="Token listrik">
            <div className="pln-code-heading">
              <div>
                <span className="pln-code-kicker">KODE UNTUK METERAN</span>
                <h2>Token PLN</h2>
              </div>
              <span className="pln-digit-count">20 DIGIT</span>
            </div>
            <div className="pln-token-digits" aria-label="12345678901234567890">
              {tokenGroups.map((group, index) => (
                <span className="pln-token-group" key={`${group}-${index}`}>{group}</span>
              ))}
            </div>
            <p className="pln-token-help">Masukkan kode ini pada meteran listrik Anda</p>
          </section>

          <section className="pln-reference" aria-label="Nomor seri dan referensi transaksi">
            <div className="pln-reference-heading">
              <div>
                <span className="pln-label">SN / REF</span>
                <p>Referensi transaksi</p>
              </div>
            </div>
            <code>1116-5582-3664-4430-2835-4927-3310</code>
          </section>

          <section className="pln-details" aria-label="Rincian transaksi">
            <div className="pln-detail">
              <span className="pln-label">NO. TRANSAKSI</span>
              <strong>#5344150</strong>
            </div>
            <div className="pln-detail pln-detail-right">
              <span className="pln-label">TANGGAL</span>
              <strong>19/10/2026 · 10:42</strong>
            </div>
            <div className="pln-detail">
              <span className="pln-label">METODE PEMBAYARAN</span>
              <strong>QRIS</strong>
            </div>
            <div className="pln-detail pln-detail-right">
              <span className="pln-label">PENYEDIA</span>
              <strong>PLN</strong>
            </div>
            <div className="pln-detail">
              <span className="pln-label">NO. HP</span>
              <strong>0812-0000-0000</strong>
            </div>
            <div className="pln-detail pln-detail-right">
              <span className="pln-label">STATUS</span>
              <strong>Berhasil</strong>
            </div>
          </section>

          <section className="pln-total" aria-label="Total pembayaran">
            <div>
              <span className="pln-label">TOTAL PEMBAYARAN</span>
              <span className="pln-total-note">1 transaksi · lunas</span>
            </div>
            <strong>Rp 55.000</strong>
          </section>

          <footer className="pln-footer">
            <span className="pln-footer-mark" aria-hidden="true">✓</span>
            <span>Transaksi tercatat <b>#5344150</b></span>
            <span className="pln-footer-right">KONTERKUOTA</span>
          </footer>
        </div>
      </article>

      <style>{`
        .pln-preview {
          --pln-ink: #17342f;
          --pln-muted: #71807a;
          --pln-paper: #fbfaf5;
          --pln-line: #e5e6dc;
          box-sizing: border-box;
          min-height: 100vh;
          padding: 18px 0;
          background: #e9eee8;
          color: var(--pln-ink);
          font-family: "DM Sans", "Trebuchet MS", sans-serif;
        }
        .pln-preview *,
        .pln-preview *::before,
        .pln-preview *::after { box-sizing: border-box; }
        .pln-paper {
          width: min(100%, 640px);
          min-height: 920px;
          margin: 0 auto;
          overflow: hidden;
          background: var(--pln-paper);
          box-shadow: 0 12px 36px rgba(35, 57, 45, .12);
        }
        .pln-header {
          min-height: 102px;
          padding: 24px 34px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          color: #f7f5e9;
          background: #173d36;
          border-bottom: 5px solid #e4a743;
        }
        .pln-brand { display: flex; align-items: center; gap: 12px; }
        .pln-mark {
          display: grid;
          place-items: center;
          width: 42px;
          height: 42px;
          border: 1px solid rgba(255,255,255,.38);
          border-radius: 12px 12px 12px 3px;
          color: #f2bd60;
          font-family: Georgia, serif;
          font-size: 24px;
          font-weight: 700;
        }
        .pln-brand-name {
          font-size: 20px;
          font-weight: 750;
          letter-spacing: -.7px;
        }
        .pln-brand-name span { color: #efbd62; }
        .pln-header-note {
          display: grid;
          gap: 5px;
          text-align: right;
          color: #d4e0d8;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 1.35px;
        }
        .pln-header-note span + span { color: #efbd62; }
        .pln-content { padding: 30px 34px 22px; }
        .pln-intro {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 14px;
          margin-bottom: 22px;
        }
        .pln-eyebrow, .pln-label, .pln-code-kicker {
          color: var(--pln-muted);
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 1.15px;
        }
        .pln-eyebrow { color: #9c6e24; }
        .pln-intro h1 {
          margin: 6px 0 2px;
          color: #183a33;
          font-size: 29px;
          line-height: 1.08;
          letter-spacing: -1.1px;
        }
        .pln-intro p {
          margin: 7px 0 0;
          color: #697771;
          font-size: 13px;
        }
        .pln-intro p strong { color: #263e37; font-weight: 700; }
        .pln-status {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          margin-top: 3px;
          padding: 8px 11px;
          border: 1px solid #bfd9c1;
          border-radius: 999px;
          background: #e9f3e7;
          color: #28603f;
          font-size: 11px;
          font-weight: 750;
          white-space: nowrap;
        }
        .pln-status span {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #398153;
        }
        .pln-customer {
          padding: 15px 18px 16px;
          border: 1px solid #e0e3d7;
          border-radius: 11px;
          background: #f4f4eb;
        }
        .pln-customer-heading, .pln-customer-values {
          display: grid;
          grid-template-columns: 1.4fr 1fr;
          gap: 14px;
        }
        .pln-customer-values { align-items: baseline; margin-top: 7px; }
        .pln-meter-id {
          color: #203d34;
          font-family: "IBM Plex Mono", "SFMono-Regular", Consolas, monospace;
          font-size: 22px;
          letter-spacing: .45px;
        }
        .pln-customer-name {
          color: #293e37;
          font-size: 16px;
        }
        .pln-token-panel {
          margin-top: 17px;
          padding: 20px 22px 18px;
          border-radius: 13px;
          background: #1b3b35;
          color: #f7f4e9;
        }
        .pln-code-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }
        .pln-code-kicker { color: #adc3b5; }
        .pln-code-heading h2 {
          margin: 4px 0 0;
          color: #fffdf2;
          font-size: 19px;
          letter-spacing: -.3px;
        }
        .pln-digit-count {
          padding: 6px 8px;
          border: 1px solid rgba(239,189,98,.48);
          border-radius: 5px;
          color: #efbd62;
          font-family: "IBM Plex Mono", "SFMono-Regular", Consolas, monospace;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: .8px;
        }
        .pln-token-digits {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-top: 20px;
          padding: 14px 15px;
          border: 1px solid rgba(240,244,226,.22);
          border-radius: 7px;
          background: rgba(5,25,20,.24);
        }
        .pln-token-group {
          color: #fff9e8;
          font-family: "IBM Plex Mono", "SFMono-Regular", Consolas, monospace;
          font-size: clamp(17px, 3.1vw, 24px);
          font-weight: 650;
          letter-spacing: 1.4px;
          font-variant-numeric: tabular-nums;
          white-space: nowrap;
        }
        .pln-token-help {
          margin: 11px 0 0;
          color: #c1d1c6;
          font-size: 11px;
        }
        .pln-reference {
          margin-top: 14px;
          padding: 15px 17px 16px;
          border: 1px solid #e0c991;
          border-left: 4px solid #d49a39;
          border-radius: 8px;
          background: #f8f1df;
        }
        .pln-reference-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }
        .pln-reference .pln-label { color: #7a5a28; }
        .pln-reference-heading p {
          margin: 3px 0 0;
          color: #7c735e;
          font-size: 10px;
        }
        .pln-reference code {
          display: block;
          margin-top: 12px;
          color: #3a3529;
          font-family: "IBM Plex Mono", "SFMono-Regular", Consolas, monospace;
          font-size: clamp(14px, 2.5vw, 17px);
          font-weight: 750;
          letter-spacing: .35px;
          white-space: nowrap;
        }
        .pln-details {
          display: grid;
          grid-template-columns: 1fr 1fr;
          column-gap: 22px;
          row-gap: 15px;
          padding: 19px 2px 17px;
          border-bottom: 1px solid var(--pln-line);
        }
        .pln-detail { display: grid; gap: 5px; }
        .pln-detail strong {
          color: #31443d;
          font-size: 12px;
          font-weight: 700;
        }
        .pln-detail-right { text-align: right; }
        .pln-total {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 17px 1px 16px;
        }
        .pln-total > div { display: grid; gap: 4px; }
        .pln-total-note { color: #7d8980; font-size: 10px; }
        .pln-total > strong {
          color: #173d36;
          font-family: "IBM Plex Mono", "SFMono-Regular", Consolas, monospace;
          font-size: 22px;
          letter-spacing: -.7px;
          white-space: nowrap;
        }
        .pln-footer {
          display: flex;
          align-items: center;
          gap: 8px;
          min-height: 38px;
          padding-top: 11px;
          border-top: 1px dashed #d9ded3;
          color: #78837c;
          font-size: 9px;
        }
        .pln-footer-mark {
          display: grid;
          place-items: center;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #dce9dc;
          color: #326647;
          font-size: 10px;
          font-weight: 800;
        }
        .pln-footer b { color: #47584f; font-weight: 700; }
        .pln-footer-right {
          margin-left: auto;
          color: #77877d;
          font-size: 8px;
          font-weight: 800;
          letter-spacing: 1px;
        }
        @media (max-width: 480px) {
          .pln-preview { padding: 0; }
          .pln-paper { min-height: 100vh; box-shadow: none; }
          .pln-header { min-height: 88px; padding: 20px 20px; }
          .pln-content { padding: 24px 20px 18px; }
          .pln-token-panel { padding-right: 15px; padding-left: 15px; }
          .pln-token-digits { gap: 5px; padding: 13px 9px; }
          .pln-token-group { font-size: clamp(15px, 4.4vw, 20px); letter-spacing: .8px; }
          .pln-details { column-gap: 12px; }
          .pln-detail strong { font-size: 11px; }
        }
      `}</style>
    </main>
  );
}
