import fs from "node:fs";
import path from "node:path";

const trimDir = path.join(process.cwd(), "src/data/trims");

function load(make) {
  return JSON.parse(fs.readFileSync(path.join(trimDir, `${make}.json`), "utf8"));
}
function save(make, data) {
  fs.writeFileSync(
    path.join(trimDir, `${make}.json`),
    `${JSON.stringify(data, null, 2)}\n`,
  );
}

// --- Tesla Model Y HP ---
{
  const data = load("tesla");
  for (const year of ["2024", "2025", "2026"]) {
    for (const t of data["model-y"][year].trims) {
      if (t.id === "rwd") t.horsepower = 295;
      if (t.id === "long-range") t.horsepower = 425;
      if (t.id === "performance") t.horsepower = 510;
    }
  }
  save("tesla", data);
  console.log("tesla/model-y HP filled");
}

// --- Ford Mach-E 2026 range + Premium SR/ER ---
{
  const data = load("ford");
  data["mustang-mach-e"]["2026"] = {
    defaultTrimId: "premium-er",
    trims: [
      {
        id: "premium-sr",
        name: "Premium Standard Range",
        engine: "Electric",
        aspiration: "Electric",
        horsepower: 365,
        transmission: "Single-speed",
        drivetrain: "AWD",
        rangeMiles: 260,
        seatingCapacity: 5,
      },
      {
        id: "premium-er",
        name: "Premium Extended Range",
        engine: "Electric",
        aspiration: "Electric",
        horsepower: 365,
        transmission: "Single-speed",
        drivetrain: "AWD",
        rangeMiles: 320,
        seatingCapacity: 5,
      },
      {
        id: "gt",
        name: "GT",
        engine: "Dual-motor electric",
        aspiration: "Electric",
        horsepower: 480,
        transmission: "Single-speed",
        drivetrain: "AWD",
        rangeMiles: 280,
        seatingCapacity: 5,
      },
    ],
  };

  // Lightning 2026: XLT discontinued, STX at 290 mi
  data["f-150-lightning"]["2026"] = {
    defaultTrimId: "stx",
    trims: [
      {
        id: "stx",
        name: "STX",
        engine: "Dual-motor electric",
        aspiration: "Electric",
        horsepower: 580,
        transmission: "Single-speed",
        drivetrain: "AWD",
        rangeMiles: 290,
        seatingCapacity: 5,
        towingLb: 7700,
        notes: "STX replaces XLT for 2026.",
      },
      {
        id: "xlt",
        name: "XLT (discontinued)",
        engine: "Dual-motor electric",
        aspiration: "Electric",
        horsepower: 580,
        transmission: "Single-speed",
        drivetrain: "AWD",
        seatingCapacity: 5,
        notes: "XLT discontinued for 2026; see STX.",
      },
    ],
  };

  data.fusion["2020"] = {
    defaultTrimId: "se",
    trims: [
      {
        id: "se",
        name: "SE 2.5L",
        engine: "2.5L i-VCT I4",
        horsepower: 175,
        transmission: "6-speed automatic",
        drivetrain: "FWD",
        notes: "Final U.S. model year.",
      },
      {
        id: "titanium-15",
        name: "1.5L EcoBoost",
        engine: "1.5L EcoBoost Turbo I4",
        horsepower: 181,
        transmission: "6-speed automatic",
        drivetrain: "FWD / AWD",
      },
      {
        id: "titanium-20",
        name: "2.0L EcoBoost",
        engine: "2.0L EcoBoost Turbo I4",
        horsepower: 245,
        transmission: "6-speed automatic",
        drivetrain: "FWD / AWD",
      },
    ],
  };

  data["fiesta-st"]["2019"] = {
    defaultTrimId: "st",
    trims: [
      {
        id: "st",
        name: "Fiesta ST",
        engine: "1.6L EcoBoost Turbo I4",
        horsepower: 197,
        transmission: "6-speed manual",
        drivetrain: "FWD",
        notes: "Final U.S. model year.",
      },
    ],
  };

  data.focus["2018"] = {
    defaultTrimId: "se",
    trims: [
      {
        id: "se-10",
        name: "1.0L EcoBoost",
        engine: "1.0L EcoBoost Turbo I3",
        horsepower: 123,
        transmission: "5-speed manual / 6-speed automatic",
        drivetrain: "FWD",
        notes: "Final U.S. model year.",
      },
      {
        id: "se",
        name: "2.0L Ti-VCT",
        engine: "2.0L Ti-VCT I4",
        horsepower: 160,
        transmission: "5-speed manual / 6-speed automatic",
        drivetrain: "FWD",
      },
    ],
  };

  data["focus-rs"]["2018"] = {
    defaultTrimId: "rs",
    trims: [
      {
        id: "rs",
        name: "Focus RS",
        engine: "2.3L EcoBoost Turbo I4",
        horsepower: 350,
        transmission: "6-speed manual",
        drivetrain: "AWD",
        notes: "Final U.S. model year.",
      },
    ],
  };

  data.gt["2022"] = {
    defaultTrimId: "gt",
    trims: [
      {
        id: "gt",
        name: "GT",
        engine: "3.5L EcoBoost Twin-Turbo V6",
        horsepower: 660,
        transmission: "7-speed dual-clutch",
        drivetrain: "RWD",
        notes: "Final catalog year for limited production.",
      },
    ],
  };

  save("ford", data);
  console.log("ford Mach-E / Lightning / stubs updated");
}

// --- Mercedes PHEV electric range ---
{
  const data = load("mercedes-benz");
  for (const year of ["2024", "2025", "2026"]) {
    const t = data["s-class"][year].trims.find((x) => x.id === "amg-s63");
    if (t) {
      t.rangeMiles = 16;
      t.horsepower = 791;
    }
  }
  for (const year of ["2025", "2026"]) {
    const t = data["amg-gt"][year].trims.find((x) => x.id === "gt63s-e");
    if (t) {
      t.rangeMiles = 8;
      t.horsepower = 805;
    }
  }
  save("mercedes-benz", data);
  console.log("mercedes PHEV range filled");
}

// --- Chevy Bolt EV 2023 ---
{
  const data = load("chevrolet");
  data["bolt-ev"]["2023"] = {
    defaultTrimId: "1lt",
    trims: [
      {
        id: "1lt",
        name: "1LT",
        engine: "Electric (65 kWh)",
        aspiration: "Electric",
        horsepower: 200,
        transmission: "Single-speed",
        drivetrain: "FWD",
        batteryKwh: 65,
        rangeMiles: 259,
        seatingCapacity: 5,
        notes: "Final first-gen Bolt EV year; returns planned as 2027.",
      },
    ],
  };
  save("chevrolet", data);
  console.log("chevrolet/bolt-ev filled");
}

// --- Jeep Renegade 2023 ---
{
  const data = load("jeep");
  data.renegade["2023"] = {
    defaultTrimId: "latitude",
    trims: [
      {
        id: "latitude",
        name: "Latitude",
        engine: "1.3L MultiAir Turbo I4",
        horsepower: 177,
        transmission: "9-speed automatic",
        drivetrain: "AWD",
        notes: "Final U.S. model year.",
      },
    ],
  };
  save("jeep", data);
  console.log("jeep/renegade filled");
}

console.log("done");
