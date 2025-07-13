import express from "express";
import axios from "axios";
import * as cheerio from "cheerio";
import puppeteer from "puppeteer";
import cors from "cors";

const app = express();
app.use(cors());
const PORT = 5001;

// Configuración de Puppeteer
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

// Middleware para logs detallados
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Ruta para buscar en Cúspide (mejorada)
/* app.get("/api/cuspide/:isbn", async (req, res) => {
  const { isbn } = req.params;
  console.log(`\n========== CÚSPIDE ==========\n`);
  console.log(`[PASO 1] ISBN recibido: ${isbn}`);

  try {
    const searchUrl = `https://www.cuspide.com/resultados.aspx?c=&tema=5&titulo=&autor=&isbn=${isbn}`;
    console.log(`[PASO 2] URL de búsqueda: ${searchUrl}`);

    const response = await axios.get(searchUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        "Accept-Language": "es-ES,es;q=0.9",
      },
      timeout: 10000,
    });

    console.log(`[PASO 3] Estado de respuesta: ${response.status}`);
    if (response.status !== 200) {
      console.warn(`[ADVERTENCIA] Respuesta HTTP no es 200`);
    }

    const $ = cheerio.load(response.data);
    const detalleUrl = $(".product-item .product-item-details a")
      .first()
      .attr("href");

    console.log(
      `[PASO 4] Enlace de detalle encontrado: ${detalleUrl || "No encontrado"}`
    );

    if (!detalleUrl) {
      console.log("[PASO 5] No se encontró el libro en los resultados");
      return res.status(404).json({ error: "Libro no encontrado en Cúspide" });
    }

    const fullDetailUrl = detalleUrl.startsWith("http")
      ? detalleUrl
      : `https://www.cuspide.com${detalleUrl}`;
    console.log(`[PASO 6] URL completa de detalle: ${fullDetailUrl}`);

    const detailResponse = await axios.get(fullDetailUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      },
      timeout: 10000,
    });

    console.log(
      `[PASO 7] Respuesta de detalle recibida: ${detailResponse.status}`
    );
    const $detail = cheerio.load(detailResponse.data);

    const titulo = $detail(".product-info-main .page-title").text().trim();
    const autor = $detail(".product-info-main .author a").text().trim();
    const editorial = $detail(".product-info-main .editorial a").text().trim();
    const precioText = $detail(".product-info-main .price-wrapper .price")
      .text()
      .trim();
    const precio =
      parseFloat(precioText.replace(/[^\d,]/g, "").replace(",", ".")) || 0;

    console.log("[PASO 8] Datos obtenidos:", {
      titulo,
      autor,
      editorial,
      precio,
    });

    res.json({
      titulo,
      autor,
      editorial,
      precio,
      fuente: "Cúspide",
      url: fullDetailUrl,
    });
  } catch (error) {
    console.error("[ERROR GENERAL - CÚSPIDE]", error.message);
    console.error("[ERROR STACK]", error.stack);
    res.status(500).json({
      error: "Error al buscar en Cúspide",
      details: error.message,
      isbn,
    });
  }
});
 */
app.get("/api/cuspide/:isbn", async (req, res) => {
  const { isbn } = req.params;
  console.log(`[CÚSPIDE] Iniciando búsqueda para ISBN: ${isbn}`);

  const searchUrl = `https://www.cuspide.com/resultados.aspx?c=&tema=5&titulo=&autor=&isbn=${isbn}`;

  try {
    const browser = await puppeteer.launch(PUPPETEER_OPTIONS);
    const page = await browser.newPage();

    await page.goto(searchUrl, { waitUntil: "networkidle2", timeout: 15000 });

    // Espera a que los resultados aparezcan
    await page.waitForSelector(".product-item .product-item-details a", {
      timeout: 5000,
    });

    const detalleUrl = await page.$eval(
      ".product-item .product-item-details a",
      (el) => el.href
    );

    if (!detalleUrl) {
      console.log("[CÚSPIDE] No se encontró el libro en los resultados");
      await browser.close();
      return res.status(404).json({ error: "Libro no encontrado en Cúspide" });
    }

    console.log(`[CÚSPIDE] URL de detalle: ${detalleUrl}`);
    await page.goto(detalleUrl, { waitUntil: "networkidle2", timeout: 15000 });

    const data = await page.evaluate(() => {
      const titulo = document.querySelector(".product-info-main .page-title")?.innerText.trim() || "";
      const autor = document.querySelector(".product-info-main .author a")?.innerText.trim() || "";
      const editorial = document.querySelector(".product-info-main .editorial a")?.innerText.trim() || "";
      const precioText = document.querySelector(".product-info-main .price-wrapper .price")?.innerText.trim() || "";
      const precio = parseFloat(precioText.replace(/[^\d,]/g, "").replace(",", ".")) || 0;

      return { titulo, autor, editorial, precio };
    });

    await browser.close();

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
  }
});

/* // Ruta para buscar en Santa Fe (mejorada)
app.get("/api/santafe/:isbn", async (req, res) => {
  const { isbn } = req.params;
  console.log(`[SANTA FE] Iniciando búsqueda para ISBN: ${isbn}`);

  try {
    const searchUrl = `https://www.lsf.com.ar/busqueda/listaLibros.aspx?criterio=ISBN:${isbn}`;
    console.log(`[SANTA FE] URL de búsqueda: ${searchUrl}`);

    const response = await axios.get(searchUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
      timeout: 10000,
    });

    console.log(`[SANTA FE] Estado de respuesta: ${response.status}`);

    const $ = cheerio.load(response.data);
    const detalleUrl = $(".listaLibros .libro a").first().attr("href");

    console.log(
      `[SANTA FE] Enlace de detalle encontrado: ${
        detalleUrl || "No encontrado"
      }`
    );

    if (!detalleUrl) {
      console.log("[SANTA FE] No se encontró el libro en los resultados");
      return res.status(404).json({ error: "Libro no encontrado en Santa Fe" });
    }

    const fullDetailUrl = detalleUrl.startsWith("http")
      ? detalleUrl
      : `https://www.lsf.com.ar${detalleUrl}`;
    console.log(`[SANTA FE] URL completa de detalle: ${fullDetailUrl}`);

    const detailResponse = await axios.get(fullDetailUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
      timeout: 10000,
    });

    const $detail = cheerio.load(detailResponse.data);

    const titulo = $detail(".detalleLibro h1").text().trim();
    const autor = $detail(".detalleLibro .autor a").text().trim();
    const editorial = $detail(".detalleLibro .editorial a").text().trim();
    const precioText = $detail(".detalleLibro .precio").text().trim();
    const precio =
      parseFloat(precioText.replace(/[^\d,]/g, "").replace(",", ".")) || 0;

    console.log("[SANTA FE] Datos obtenidos:", {
      titulo,
      autor,
      editorial,
      precio,
    });

    res.json({
      titulo,
      autor,
      editorial,
      precio,
      fuente: "Librería Santa Fe",
      url: fullDetailUrl,
    });
  } catch (error) {
    console.error("[SANTA FE] Error completo:", error);
    res.status(500).json({
      error: "Error al buscar en Santa Fe",
      details: error.message,
      isbn,
    });
  }
});

// Ruta para buscar en Tematika (mejorada con Puppeteer)
app.get("/api/tematika/:isbn", async (req, res) => {
  const { isbn } = req.params;
  console.log(`[TEMATIKA] Iniciando búsqueda para ISBN: ${isbn}`);

  let browser;
  try {
    const searchUrl = `https://www.tematika.com/search/?q=${isbn}`;
    console.log(`[TEMATIKA] URL de búsqueda: ${searchUrl}`);

    browser = await puppeteer.launch(PUPPETEER_OPTIONS);
    const page = await browser.newPage();

    // Configurar User-Agent y viewport
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    );
    await page.setViewport({ width: 1280, height: 800 });

    // Navegar a la página de búsqueda
    console.log("[TEMATIKA] Navegando a la página de búsqueda...");
    await page.goto(searchUrl, {
      waitUntil: "networkidle2",
      timeout: 30000,
    });

    // Esperar a que carguen los resultados
    console.log("[TEMATIKA] Esperando resultados...");
    try {
      await page.waitForSelector(".product-item", { timeout: 10000 });
    } catch (e) {
      console.log("[TEMATIKA] No se encontraron resultados de productos");
      return res.status(404).json({ error: "Libro no encontrado en Tematika" });
    }

    // Obtener enlace al primer producto
    const productLink = await page.evaluate(() => {
      const firstProduct = document.querySelector(
        ".product-item .product-item-link"
      );
      return firstProduct ? firstProduct.href : null;
    });

    console.log(
      `[TEMATIKA] Enlace de producto encontrado: ${
        productLink || "No encontrado"
      }`
    );

    if (!productLink) {
      return res.status(404).json({ error: "Libro no encontrado en Tematika" });
    }

    // Navegar a la página del producto
    console.log("[TEMATIKA] Navegando a la página del producto...");
    await page.goto(productLink, {
      waitUntil: "networkidle2",
      timeout: 30000,
    });

    // Extraer datos del producto
    console.log("[TEMATIKA] Extrayendo datos del producto...");
    const bookData = await page.evaluate(() => {
      const titulo =
        document.querySelector(".product-title")?.innerText.trim() || "";
      const autor =
        document.querySelector(".product-author a")?.innerText.trim() || "";
      const editorial =
        document.querySelector(".product-publisher a")?.innerText.trim() || "";

      let precio = 0;
      const precioElement =
        document.querySelector(".price-final") ||
        document.querySelector(".price");
      if (precioElement) {
        const precioText = precioElement.innerText.trim();
        precio =
          parseFloat(precioText.replace(/[^\d,]/g, "").replace(",", ".")) || 0;
      }

      return { titulo, autor, editorial, precio };
    });

    console.log("[TEMATIKA] Datos obtenidos:", bookData);

    await browser.close();

    res.json({
      ...bookData,
      fuente: "Tematika (Yenny/El Ateneo)",
      url: productLink,
    });
  } catch (error) {
    console.error("[TEMATIKA] Error completo:", error);
    if (browser) await browser.close();
    res.status(500).json({
      error: "Error al buscar en Tematika",
      details: error.message,
      isbn,
    });
  }
});
 */
// Ruta de prueba
app.get("/", (req, res) => {
  res.send("Servidor de scraping funcionando");
});

app.listen(PORT, () => {
  console.log(`Servidor de scraping corriendo en http://localhost:${PORT}`);
});
