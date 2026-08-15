const CONFIG = {
  whatsappNumber: "5581981377933",
  restaurantName: "Don Massas",
  orderCounterEndpoint: "https://script.google.com/macros/s/AKfycbxsmKCavhXvnAkWPxY1upPqHL92tK7GgvtBcaJTZYcHbIkAdBtXwY3V0AQuPhxSQaLD/exec",
  painelPin: "1234",
  businessHours: {
    closedWeekday: 1,
    ranges: [
    { start: "11:00", end: "15:00" },
    { start: "18:00", end: "22:00" }
    ]
  }
};

const BAIRROS_ENTREGA = [
  { taxa: 5, bairros: ["Apipucos", "Casa Amarela", "Casa Forte", "Poço da Panela", "Dois Irmãos", "Monteiro"] },
  { taxa: 8, bairros: ["Parnamirim", "Jaqueira", "Tamarineira", "Água Fria", "Rosarinho", "Graças", "Aflitos", "Arruda", "Beberibe"] },
  { taxa: 12, bairros: ["Encruzilhada", "Espinheiro", "Hipódromo", "Campo Grande", "Alto Santa Terezinha"] }
];

function taxaEntregaPorBairro(bairro){
  if (!bairro) return 0;
  const grupo = BAIRROS_ENTREGA.find(g => g.bairros.includes(bairro));
  return grupo ? grupo.taxa : 0;
}