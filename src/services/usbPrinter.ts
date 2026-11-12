import QRCode from "qrcode";

const DEFAULT_USB_PRINTER_NAME = "KP-IM607 / POS58";

let printerConnected = false;

export type ReceiptOrderItem = {
  name: string;
  size?: string;
  quantity: number;
  price: number;
  extras?: Array<{ name: string; price: number }>;
  observation?: string;
};

export type ReceiptOrderData = {
  id: number;
  customer_name: string;
  customer_phone: string;
  street: string;
  number: string;
  district?: string;
  cep?: string;
  items: ReceiptOrderItem[];
  total: number;
  payment_method: string;
  change_for?: number | null;
  notes?: string;
  created_at?: string;
  latitude?: number | null;
  longitude?: number | null;
  location_url?: string | null;
  location_accuracy?: number | null;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export async function generateQrCodeDataUrl(text: string): Promise<string> {
  if (!text || !text.trim()) return "";
  try {
    return await QRCode.toDataURL(text.trim(), {
      width: 150,
      margin: 1,
      color: {
        dark: "#000000",
        light: "#ffffff",
      },
      errorCorrectionLevel: "M",
    });
  } catch (err) {
    console.error("Erro ao gerar QR Code para impressao:", err);
    return "";
  }
}

function buildReceiptHtml(text: string) {
  const content = escapeHtml(text);

  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <title>Impressao ${DEFAULT_USB_PRINTER_NAME}</title>
    <style>
      @page {
        size: 58mm auto;
        margin: 2mm;
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        color: #000;
        background: #fff;
        font-family: "Courier New", monospace;
        font-size: 10px;
        line-height: 1.3;
      }

      .receipt {
        width: 52mm;
        white-space: pre-wrap;
        word-break: break-word;
      }
    </style>
  </head>
  <body>
    <pre class="receipt">${content}

</pre>
  </body>
</html>`;
}

function buildOrderReceiptHtml(order: ReceiptOrderData, qrCodeDataUrl?: string) {
  const createdAt = order.created_at ? new Date(order.created_at) : new Date();
  const formattedDate = createdAt.toLocaleString("pt-BR");

  let itemsHtml = "";
  (order.items ?? []).forEach((item) => {
    const sizeStr = item.size ? ` (${escapeHtml(item.size)})` : "";
    const subtotal = (item.price * item.quantity).toFixed(2);
    itemsHtml += `
      <div style="margin-bottom: 4px;">
        <div style="font-weight: bold;">${item.quantity}x ${escapeHtml(item.name)}${sizeStr}</div>`;

    if (item.extras && item.extras.length > 0) {
      item.extras.forEach((extra) => {
        itemsHtml += `<div style="font-size: 9px; padding-left: 6px;">+ ${escapeHtml(extra.name)} R$ ${extra.price.toFixed(2)}</div>`;
      });
    }

    if (item.observation) {
      itemsHtml += `<div style="font-size: 9px; padding-left: 6px; font-style: italic;">Obs: ${escapeHtml(item.observation)}</div>`;
    }

    itemsHtml += `<div style="font-size: 9px; text-align: right;">Subtotal: R$ ${subtotal}</div>
      </div>`;
  });

  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <title>Pedido #${order.id} - Sabor da Praia</title>
    <style>
      @page {
        size: 58mm auto;
        margin: 2mm;
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        padding: 0;
        color: #000;
        background: #fff;
        font-family: "Courier New", Courier, monospace, sans-serif;
        font-size: 10px;
        line-height: 1.25;
      }

      .receipt {
        width: 52mm;
        margin: 0 auto;
        word-break: break-word;
      }

      .text-center {
        text-align: center;
      }

      .bold {
        font-weight: bold;
      }

      .divider {
        border-top: 1px dashed #000;
        margin: 5px 0;
      }

      .qr-container {
        text-align: center;
        margin: 6px 0;
        padding: 4px 0;
        background: #ffffff;
      }

      .qr-container img {
        width: 140px;
        height: 140px;
        margin: 0 auto;
        display: block;
        image-rendering: -webkit-optimize-contrast;
      }

      .qr-label {
        font-size: 10px;
        font-weight: bold;
        margin-bottom: 3px;
        text-transform: uppercase;
      }

      .qr-caption {
        font-size: 8px;
        font-weight: bold;
        margin-top: 4px;
        line-height: 1.15;
        text-align: center;
      }

      .section-label {
        font-size: 10px;
        font-weight: bold;
        text-transform: uppercase;
        margin-top: 4px;
      }
    </style>
  </head>
  <body>
    <div class="receipt">
      <div class="text-center bold" style="font-size: 13px;">SABOR DA PRAIA DELIVERY</div>
      <div class="text-center bold" style="font-size: 12px; margin: 2px 0;">PEDIDO #${order.id}</div>
      <div class="text-center" style="font-size: 9px;">${formattedDate}</div>
      
      <div class="divider"></div>

      <div class="section-label">CLIENTE:</div>
      <div>${escapeHtml(order.customer_name || "Cliente")}</div>

      <div class="section-label">WHATSAPP:</div>
      <div>${escapeHtml(order.customer_phone || "")}</div>

      <div class="section-label">ENDEREÇO DE ENTREGA:</div>
      <div>${escapeHtml(order.street || "")}, ${escapeHtml(order.number || "")}</div>
      ${order.district ? `<div>Bairro: ${escapeHtml(order.district)}</div>` : ""}
      ${order.cep ? `<div>CEP: ${escapeHtml(order.cep)}</div>` : ""}

      ${
        qrCodeDataUrl
          ? `
      <div class="divider"></div>
      <div class="qr-container">
        <div class="qr-label">LOCALIZAÇÃO GPS:</div>
        <img src="${qrCodeDataUrl}" alt="QR Code Localização GPS" />
        <div class="qr-caption">ESCANEIE PARA ABRIR A LOCALIZAÇÃO NO GOOGLE MAPS</div>
      </div>
      `
          : ""
      }

      ${
        order.notes && order.notes.trim()
          ? `
      <div class="divider"></div>
      <div class="section-label">REFERÊNCIA / OBS:</div>
      <div style="font-size: 9px;">${escapeHtml(order.notes)}</div>
      `
          : ""
      }

      <div class="divider"></div>
      <div class="section-label">ITENS:</div>
      ${itemsHtml}

      <div class="divider"></div>
      <div><span class="bold">PAGAMENTO:</span> ${escapeHtml(order.payment_method || "PIX")}</div>
      ${order.change_for ? `<div><span class="bold">TROCO P/:</span> R$ ${order.change_for.toFixed(2)}</div>` : ""}
      <div class="bold" style="font-size: 12px; margin-top: 4px;">TOTAL: R$ ${Number(order.total || 0).toFixed(2)}</div>
      
      <div class="divider"></div>
      <div class="text-center bold" style="font-size: 9px; margin-top: 6px;">OBRIGADO PELA PREFERÊNCIA!</div>
      <div style="height: 12mm;"></div>
    </div>
  </body>
</html>`;
}

export function isUsbPrinterAvailable() {
  return typeof window !== "undefined" && typeof window.print === "function";
}

export function isUsbPrinterConnected() {
  return printerConnected;
}

export async function connectUsbPrinter() {
  if (!isUsbPrinterAvailable()) {
    throw new Error("Impressao pelo navegador nao esta disponivel neste ambiente.");
  }

  printerConnected = true;
  return { name: DEFAULT_USB_PRINTER_NAME };
}

export async function disconnectUsbPrinter() {
  printerConnected = false;
}

async function printHtmlViaIframe(htmlContent: string) {
  if (!isUsbPrinterAvailable()) {
    throw new Error("Impressao pelo navegador nao esta disponivel neste ambiente.");
  }

  if (!isUsbPrinterConnected()) {
    await connectUsbPrinter();
  }

  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.setAttribute("aria-hidden", "true");

  document.body.appendChild(iframe);

  const frameWindow = iframe.contentWindow;
  const frameDocument = iframe.contentDocument ?? frameWindow?.document;

  if (!frameWindow || !frameDocument) {
    iframe.remove();
    throw new Error("Nao foi possivel preparar a area de impressao.");
  }

  frameDocument.open();
  frameDocument.write(htmlContent);
  frameDocument.close();

  await new Promise<void>((resolve) => {
    window.setTimeout(resolve, 300);
  });

  frameWindow.focus();
  frameWindow.print();

  window.setTimeout(() => {
    iframe.remove();
  }, 1000);
}

export async function printUsbText(text: string) {
  return printHtmlViaIframe(buildReceiptHtml(text));
}

export async function printOrderReceipt(order: ReceiptOrderData) {
  // Determine Google Maps URL
  let mapsUrl = order.location_url || "";
  if (!mapsUrl && order.latitude && order.longitude) {
    mapsUrl = `https://www.google.com/maps?q=${order.latitude},${order.longitude}`;
  } else if (!mapsUrl && order.notes) {
    const match = order.notes.match(/https:\/\/www\.google\.com\/maps[^\s,|]+/i);
    if (match) {
      mapsUrl = match[0];
    }
  }

  let qrCodeDataUrl = "";
  if (mapsUrl) {
    qrCodeDataUrl = await generateQrCodeDataUrl(mapsUrl);
  }

  return printHtmlViaIframe(buildOrderReceiptHtml(order, qrCodeDataUrl));
}

export function getDefaultUsbPrinterName() {
  return DEFAULT_USB_PRINTER_NAME;
}
