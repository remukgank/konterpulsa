import currentReceipt from "./current-receipt.svg?url";

export function CurrentReceipt() {
  return (
    <main
      aria-label="Struk saat ini"
      style={{
        width: 640,
        margin: "0 auto",
        background: "#e9edf3",
      }}
    >
      <img
        src={currentReceipt}
        alt="Contoh struk pembayaran KonterPulsa saat ini, termasuk detail transaksi, SN/Ref, dan token listrik"
        style={{ display: "block", width: "100%", height: "auto" }}
      />
    </main>
  );
}
