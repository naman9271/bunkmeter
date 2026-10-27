import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BunkMeter — attendance, decoded",
  description: "Upload your attendance sheet and see exactly how many classes you can skip.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="aurora">
          <div className="blob" style={{ width: 520, height: 520, background: "#5b3cff", top: -140, left: -120 }} />
          <div className="blob" style={{ width: 460, height: 460, background: "#00d4a8", top: "35%", right: -140, animationDelay: "-6s" }} />
          <div className="blob" style={{ width: 420, height: 420, background: "#ff2f7d", bottom: -160, left: "30%", animationDelay: "-11s" }} />
        </div>
        {children}
      </body>
    </html>
  );
}
