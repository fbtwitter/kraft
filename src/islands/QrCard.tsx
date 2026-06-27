const QrCard = () => {
  return (
    <div
      style={{
        all: "revert",
        fontFamily: "Outfit, sans-serif",
        background: "hsl(0, 0%, 100%)",
        borderRadius: "20px",
        padding: "16px",
        maxWidth: "320px",
        boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
      }}
    >
      <img
        src="/experiments/qr-code-card/qr-code.png"
        alt="QR code to Frontend Mentor"
        style={{ width: "100%", borderRadius: "10px" }}
      />
      <div
        style={{
          textAlign: "center",
          padding: "16px 8px 8px",
          fontFamily: "Outfit, sans-serif",
        }}
      >
        <h2
          style={{
            fontSize: "1.375rem",
            fontWeight: 700,
            color: "hsl(218, 44%, 22%)",
            margin: "0 0 12px",
          }}
        >
          Improve your front-end skills by building projects
        </h2>
        <p style={{ fontSize: "1rem", color: "hsl(220, 15%, 55%)", margin: 0 }}>
          Scan the QR code to visit Frontend Mentor and take your coding skills
          to the next level
        </p>
      </div>
    </div>
  );
};

export default QrCard;
