// Service d'impression de tickets thermiques conforme réglementation algérienne (ESC/POS 80mm)

export interface ReceiptData {
  numeroTicket: string;
  nomClient: string;
  articles: Array<{
    designation: string;
    quantite: number;
    prix: number;
    total: number;
  }>;
  totalHT: number;
  tva: number;
  totalTTC: number;
  modeReglement: string;
  especesRecues?: number;
  monnaieRendue?: number;
  date?: string;
}

export class PosThermalPrinterService {
  /**
   * Génère le buffer binaire ESC/POS pour imprimante thermique 80mm
   * Conforme aux commandes d'impression du code Flutter d'origine
   */
  generateEscPosReceipt(data: ReceiptData): Uint8Array {
    const bytes: number[] = [];
    const encoder = new TextEncoder();

    const addText = (text: string) => {
      const arr = encoder.encode(text);
      for (let i = 0; i < arr.length; i++) {
        bytes.push(arr[i]);
      }
    };

    // ESC @ : Initialisation imprimante
    bytes.push(0x1b, 0x40);

    // ESC a 1 : Alignement centré
    bytes.push(0x1b, 0x61, 0x01);

    // En-tête fiscal algérien (IntelliX Silwane ERP)
    addText('GROUPE INTELLIX SILWANE\n');
    addText('Distribution Commerciale Algérie\n');
    addText('08 Rue des Freres Bouadou, Alger\n');
    addText('Tel: 023 54 12 80 / 0560 01 02 03\n');
    addText('RC: 16/00-098234B02 | NIF: 000216098234851\n');
    addText('NIS: 099816010045231 | Art.Imp: 16012489012\n');
    addText('------------------------------------------------\n');

    // ESC a 0 : Alignement gauche
    bytes.push(0x1b, 0x61, 0x00);
    addText(`Ticket: ${data.numeroTicket}\n`);
    addText(`Date: ${data.date || new Date().toLocaleString('fr-FR')}\n`);
    addText(`Client: ${data.nomClient}\n`);
    addText('------------------------------------------------\n');

    // Tableau des articles
    addText('Article                     Qte x PU     Total DA\n');
    for (const art of data.articles) {
      const des = (art.designation + '                        ')
        .substring(0, 24);
      const qtePu = (`${art.quantite}x${art.prix.toFixed(0)}` + '            ')
        .substring(0, 12);
      const total = art.total.toFixed(2).padStart(10, ' ');
      addText(`${des} ${qtePu} ${total}\n`);
    }
    addText('------------------------------------------------\n');

    // Totaux
    addText(`Total HT : ${data.totalHT.toFixed(2)} DA\n`);
    addText(`TVA      : ${data.tva.toFixed(2)} DA\n`);

    // ESC ! 0x30 : Total TTC en double hauteur/largeur
    bytes.push(0x1b, 0x21, 0x30);
    addText(`TOTAL TTC: ${data.totalTTC.toFixed(2)} DA\n`);
    // ESC ! 0x00 : Réinitialisation police
    bytes.push(0x1b, 0x21, 0x00);

    addText(`Reglement: ${data.modeReglement}\n`);
    if (data.especesRecues && data.especesRecues > 0) {
      addText(`Recu     : ${data.especesRecues.toFixed(2)} DA\n`);
      addText(`Rendu    : ${(data.monnaieRendue || 0).toFixed(2)} DA\n`);
    }

    // Pied de ticket et coupure papier
    bytes.push(0x1b, 0x61, 0x01);
    addText('------------------------------------------------\n');
    addText('Merci pour votre confiance !\n\n\n');

    // GS V 0x41 0x10 : Coupure partielle papier
    bytes.push(0x1d, 0x56, 0x41, 0x10);

    return new Uint8Array(bytes);
  }
}

export const posThermalPrinterService = new PosThermalPrinterService();
