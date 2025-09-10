export const metadata = {
  title: "Gerador IN1888",
  description: "Gera TXT 0110/0120 a partir de Excel",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body style={{ margin: 0, fontFamily: "system-ui, Arial, sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
