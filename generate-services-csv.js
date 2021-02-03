const fs = require("fs");
const outputPath = process.argv[2];
const { fetchServices } = require("./src/providers");

const allServices = fetchServices(["*"]);
let csv = "Service Name,Service Key,Provider Name\n";
allServices.forEach((service) => {
  csv += `${service.name},${service.key},${service.providerName}\n`;
});

fs.writeFileSync(outputPath, csv);
