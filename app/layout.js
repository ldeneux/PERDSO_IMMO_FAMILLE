import "./globals.css";

export const metadata = {
  title: "Immo famille",
  description: "Gestion locative partagée : contacts, biens, baux, suivi",
};

export const viewport = {
  themeColor: "#1e3a8a",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
