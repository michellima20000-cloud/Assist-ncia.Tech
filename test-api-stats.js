async function run() {
  const todayStr = new Date().toLocaleDateString('sv-SE');
  const offset = new Date().getTimezoneOffset();
  const url = `http://localhost:3000/api/stats?today=${todayStr}&offset=${offset}`;
  
  console.log(`Fetching from: ${url}`);
  try {
    const res = await fetch(url);
    console.log(`Status: ${res.status}`);
    const data = await res.json();
    console.log("Response:", JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Error fetching stats:", err);
  }
}

run();
