import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;

import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.HashMap;
import java.util.Map;

public class ElectricityNumericalServer {
    private static final int PORT = 8080;
    private static final Path WEB_ROOT = Path.of("web").toAbsolutePath().normalize();

    public static void main(String[] args) throws IOException {
        HttpServer server = HttpServer.create(new InetSocketAddress(PORT), 0);
        server.createContext("/", ElectricityNumericalServer::handleStaticFile);
        server.setExecutor(null);
        server.start();

        System.out.println("Aplikasi berjalan di http://localhost:" + PORT);
        System.out.println("Tekan Ctrl+C untuk menghentikan server.");
    }

    private static void handleStaticFile(HttpExchange exchange) throws IOException {
        String requestPath = exchange.getRequestURI().getPath();
        if (requestPath.equals("/")) {
            requestPath = "/index.html";
        }

        Path filePath = WEB_ROOT.resolve(requestPath.substring(1)).normalize();
        if (!filePath.startsWith(WEB_ROOT) || !Files.exists(filePath) || Files.isDirectory(filePath)) {
            sendText(exchange, 404, "File tidak ditemukan");
            return;
        }

        byte[] bytes = Files.readAllBytes(filePath);
        exchange.getResponseHeaders().set("Content-Type", contentType(filePath));
        exchange.sendResponseHeaders(200, bytes.length);

        try (OutputStream output = exchange.getResponseBody()) {
            output.write(bytes);
        }
    }

    private static void sendText(HttpExchange exchange, int status, String message) throws IOException {
        byte[] bytes = message.getBytes();
        exchange.getResponseHeaders().set("Content-Type", "text/plain; charset=UTF-8");
        exchange.sendResponseHeaders(status, bytes.length);

        try (OutputStream output = exchange.getResponseBody()) {
            output.write(bytes);
        }
    }

    private static String contentType(Path path) {
        Map<String, String> types = new HashMap<>();
        types.put(".html", "text/html; charset=UTF-8");
        types.put(".css", "text/css; charset=UTF-8");
        types.put(".js", "application/javascript; charset=UTF-8");
        types.put(".png", "image/png");
        types.put(".jpg", "image/jpeg");
        types.put(".jpeg", "image/jpeg");
        types.put(".svg", "image/svg+xml");

        String fileName = path.getFileName().toString().toLowerCase();
        for (Map.Entry<String, String> entry : types.entrySet()) {
            if (fileName.endsWith(entry.getKey())) {
                return entry.getValue();
            }
        }
        return "application/octet-stream";
    }
}
