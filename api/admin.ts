
// Este arquivo foi desativado em favor da lógica de Ghost Authentication 
// implementada diretamente no clientService.ts, eliminando a necessidade 
// de Service Role Keys expostas ou complexidade de backend para este fluxo.

export default async function handler(req: any, res: any) {
  res.status(200).json({ message: "Endpoint legado desativado. Use a lógica Ghost Auth no frontend." });
}
