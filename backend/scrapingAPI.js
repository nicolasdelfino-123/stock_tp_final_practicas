import express from "express";
import axios from "axios";
import * as cheerio from "cheerio";
import puppeteer from "puppeteer";
import cors from "cors";

const app = express();
app.use(cors());
const PORT = 5001;

const PUPPETEER_OPTIONS = {
  headless: true,
  args: [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-dev-shm-usage",
    "--disable-accelerated-2d-canvas",
    "--disable-gpu",
  ],
};

// Middleware de logs
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Valida ISBN: 10 u 13 dígitos, solo números
const isValidISBN = (isbn: string) => /^[0-9]{10}([0-9]{3})?$/.test(isbn);

app.get("/api/cuspide/:isbn", async (req, res) => {
  const { isbn } = req.params;
  console.log(`[CÚSPIDE] Buscando ISBN: ${isbn}`);

  if (!isValidISBN(isbn)) {
    return res.status(400).json({ error: "ISBN inválido" });
  }

  const searchUrl = `https://www.cuspide.com/resultados.aspx?c=&tema=5&titulo=&autor=&isbn=${isbn}`;

  let browser;

  try {
    browser = await puppeteer.launch(PUPPETEER_OPTIONS);
    const page = await browser.newPage();

    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36"
    );

    await page.goto(searchUrl, { waitUntil: "networkidle2", timeout: 15000 });

    await page.waitForSelector(".product-item .product-item-details a", {
      timeout: 5000,
    });

    const detalleUrl = await page.$eval(
      ".product-item .product-item-details a",
      (el) => el.href
    );

    if (!detalleUrl) {
      console.log("[CÚSPIDE] Libro no encontrado en resultados");
      return res.status(404).json({ error: "Libro no encontrado en Cúspide" });
    }

    console.log(`[CÚSPIDE] Accediendo a: ${detalleUrl}`);
    await page.goto(detalleUrl, { waitUntil: "networkidle2", timeout: 15000 });

    const data = await page.evaluate(() => {
      const getText = (selector: string) =>
        document.querySelector(selector)?.innerText.trim() || "";

      const titulo = getText(".product-info-main .page-title");
      const autor = getText(".product-info-main .author a");
      const editorial = getText(".product-info-main .editorial a");
      const precioText = getText(".product-info-main .price-wrapper .price");
      const precio =
        parseFloat(precioText.replace(/[^\d,]/g, "").replace(",", ".")) || 0;

      return { titulo, autor, editorial, precio };
    });

    console.log("[CÚSPIDE] Datos obtenidos:", data);

    res.json({
      ...data,
      fuente: "Cúspide",
      url: detalleUrl,
    });
  } catch (error) {
    console.error("[CÚSPIDE] Error:", error.message);
    res.status(500).json({
      error: "Error al buscar en Cúspide",
      details: error.message,
      isbn,
    });
  } finally {
    if (browser) await browser.close();
  }
});

// Ruta raíz
app.get("/", (req, res) => {
  res.send("Servidor de scraping funcionando");
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
