const mapDiv = document.getElementById("map");
const infoDiv = document.getElementById("info");

const svg = d3
  .select("#map")
  .append("svg")
  .attr("width", mapDiv.clientWidth)
  .attr("height", mapDiv.clientHeight);

const projection = d3
  .geoMercator()
  .scale(150)
  .translate([mapDiv.clientWidth / 2, mapDiv.clientHeight / 2]);

const path = d3.geoPath().projection(projection);
const zoom = d3.zoom().scaleExtent([1, 6]).on("zoom", zoomed);
svg.call(zoom);

d3.json(
  "https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson"
).then((world) => {
  svg
    .append("g")
    .selectAll("path")
    .data(world.features)
    .enter()
    .append("path")
    .attr("d", path)
    .attr("fill", "#eee")
    .attr("stroke", "#333")
    .on("click", clicked);
});

let olympicData = {};

// Load Olympic data
d3.csv("dataset/athlete_events_official.csv").then((data) => {
  olympicData = data;
});

function zoomed(event) {
  svg.selectAll("path").attr("transform", event.transform);
}

function clicked(event, d) {
  const [[x0, y0], [x1, y1]] = path.bounds(d);
  event.stopPropagation();

  // Update country color on click
  svg.selectAll("path").attr("fill", function (pathData) {
    return pathData === d ? "#888" : "#eee";
  });

  // Zoom in on the clicked country
  svg
    .transition()
    .duration(750)
    .call(
      zoom.transform,
      d3.zoomIdentity
        .translate(mapDiv.clientWidth / 4, mapDiv.clientHeight / 2)
        .scale(
          Math.min(
            8,
            0.9 /
              Math.max(
                (x1 - x0) / (mapDiv.clientWidth / 2),
                (y1 - y0) / mapDiv.clientHeight
              )
          )
        )
        .translate(-(x0 + x1 - 80) / 2, -(y0 + y1) / 2)
    );

  // Show 'info' on click
  infoDiv.style.display = "flex";
  infoDiv.style.width = "40%";
  infoDiv.style.float = "left";
  mapDiv.style.width = "55%";
  mapDiv.style.float = "left";

  showCountryInfo(d);
}

// Account for countries that are in abbreviation form in the dataset
function normalizeCountryName(country) {
  switch (country.toLowerCase()) {
    case "england":
    case "uk":
    case "united kingdom":
      return "Great Britain";
    case "usa":
    case "us":
    case "united states":
    case "united states of america":
      return "United States";
    default:
      return country;
  }
}

//Get data by country
function filterDataByCountry(data, country) {
  const normalizedCountry = normalizeCountryName(country);
  return data.filter((d) => d.Team.includes(normalizedCountry));
}

//Showcase unique medals per country
function groupDataByUniqueEvents(data) {
  const uniqueEvents = new Map();

  data.forEach((d) => {
    const key = `${d.Year}-${d.Sport}-${d.Event}-${d.Medal}`;
    if (!uniqueEvents.has(key)) {
      uniqueEvents.set(key, {
        Year: d.Year,
        Sport: d.Sport,
        Event: d.Event,
        Medal: d.Medal,
        count: 1,
      });
    }
  });

  return Array.from(uniqueEvents.values());
}

//Sports have multiple events, so group events by sport and showcase on 'info' block
function aggregateMedalsBySport(data) {
  const uniqueEventsData = groupDataByUniqueEvents(data);

  const medalCounts = d3.rollup(
    uniqueEventsData,
    (v) => v.length,
    (d) => d.Sport
  );

  //Enabling sport: sportValue form
  return Array.from(medalCounts, ([sport, count]) => ({ sport, count }));
}

//Get the top 3 sports
function getTopSports(data, topN = 3) {
  return data.sort((a, b) => d3.descending(a.count, b.count)).slice(0, topN);
}

//For pie chart
function calculateMedalPercentages(data) {
  const medalCounts = { gold: 0, silver: 0, bronze: 0 };

  data.forEach((d) => {
    if (d.Medal === "Gold") medalCounts.gold++;
    else if (d.Medal === "Silver") medalCounts.silver++;
    else if (d.Medal === "Bronze") medalCounts.bronze++;
  });

  const totalMedals =
    medalCounts.gold + medalCounts.silver + medalCounts.bronze;

  return {
    gold: ((medalCounts.gold / totalMedals) * 100).toFixed(2),
    silver: ((medalCounts.silver / totalMedals) * 100).toFixed(2),
    bronze: ((medalCounts.bronze / totalMedals) * 100).toFixed(2),
  };
}

function showCountryInfo(country) {
  const countryName = country.properties.name;
  const filteredData = filterDataByCountry(olympicData, countryName);
  const aggregatedData = aggregateMedalsBySport(filteredData);
  const topSports = getTopSports(aggregatedData);
  const medalPercentages = calculateMedalPercentages(filteredData);

  let most = findCountryWithMostUniqueMedals();
  let least = findCountryWithLeastUniqueMedals();

  //console.log(most[0], most[1], least[0], least[1]);

  const info = d3.select("#info");
  info.style("display", "flex");
  info.style("flex-direction", "column");

  info.html("");

  const countryInfoDiv = info.append("div");

  countryInfoDiv.append("h1").text(countryName);
  countryInfoDiv.append("p").text("Top 3 sports with the most medals:");

  countryInfoDiv
    .style("width", "100%")
    .style("display", "flex")
    .style("align-items", "center")
    .style("flex-direction", "column");

  // Display top sports and medal counts
  if (topSports.length > 0) {
    const topSportsDiv = countryInfoDiv
      .append("div")
      .style("display", "flex")
      .style("flex-direction", "row")
      .style("width", "100%")
      .style("justify-content", "space-around");

    topSports.forEach((sport) => {
      topSportsDiv;
      topSportsDiv
        .append("div")
        .style("width", "60px")
        .style("height", "60px")
        .style("overflow", "hidden")
        .append("img")
        .attr("src", `imgs/${sport.sport}.jpg`)
        .style("object-fit", "cover")
        .style("width", "100%")
        .style("height", "100%");
      topSportsDiv.append("p").text(`${sport.sport}: ${sport.count} medals`);
      topSportsDiv
        .style("display", "flex")
        .style("justify-content", "center")
        .style("align-items", "center");
    });

    // Display the pie chart
    const pieChartDiv = countryInfoDiv.append("div").attr("id", "pieChart");
    pieChartDiv.append("canvas").attr("id", "medalPieChart");

    const ctx = document.getElementById("medalPieChart").getContext("2d");

    new Chart(ctx, {
      type: "pie",
      data: {
        labels: ["Gold", "Silver", "Bronze"],
        datasets: [
          {
            data: [
              medalPercentages.gold,
              medalPercentages.silver,
              medalPercentages.bronze,
            ],
            backgroundColor: ["#ffd700", "#c0c0c0", "#cd7f32"],
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: "top",
          },
        },
      },
    });

    //Slider info

    const value = calculateUniqueMedalsBySport(country);

    countryInfoDiv
      .append("h4")
      .text("Comparison with the most and least decorated country");

    const slider = countryInfoDiv.append("div").attr("class", "slider");

    slider.append("p").html(`${most[0]}<br>${most[1]}`);

    // Div for the scale
    const scaleDiv = slider.append("div").attr("class", "scale");

    slider.append("p").html(`${least[0]}<br>${least[1]}`);

    // Create a linear scale
    const scale = d3
      .scaleLinear()
      .domain([most[1], least[1]])
      .range([most[0], least[0]]);

    // Scale visualization
    const scaleVisualization = scaleDiv
      .append("div")
      .attr("class", "scale-visualization");

    // Dot representing the value
    const dot = scaleVisualization
      .append("div")
      .attr("class", "dot")
      .style("right", `${(value / most[1]) * 100}%`);
    dot
      .append("span")
      .text(value)
      .style("position", "relative")
      .style("top", "15px")
      .style("right", "5px");
  } else {
    countryInfoDiv.append("p").text("No data available.");
  }
}

// Handle window resize
window.addEventListener("resize", () => {
  const width = mapDiv.clientWidth;
  const height = mapDiv.clientHeight;
  svg.attr("width", width).attr("height", height);

  projection.translate([width / 2, height / 2]);

  svg.selectAll("path").attr("d", path);
});

function findCountryWithMostUniqueMedals() {
  const uniqueMedalsByCountry = {};

  olympicData.forEach((d) => {
    const country = normalizeCountryName(d.Team);
    const eventSportKey = `${d.Year}-${d.Sport}-${d.Event}`;

    if (!uniqueMedalsByCountry[country]) {
      uniqueMedalsByCountry[country] = new Set();
    }

    uniqueMedalsByCountry[country].add(eventSportKey);
  });

  let mostUniqueMedalsCount = 0;
  let mostUniqueMedalsCountry = null;

  Object.entries(uniqueMedalsByCountry).forEach(([country, eventSportSet]) => {
    const uniqueMedalsCount = eventSportSet.size;

    if (uniqueMedalsCount > mostUniqueMedalsCount) {
      mostUniqueMedalsCount = uniqueMedalsCount;
      mostUniqueMedalsCountry = country;
    }
  });

  return [mostUniqueMedalsCountry, mostUniqueMedalsCount];
}

function findCountryWithLeastUniqueMedals() {
  const uniqueMedalsByCountry = {};

  olympicData.forEach((d) => {
    const country = normalizeCountryName(d.Team);
    const eventSportKey = `${d.Year}-${d.Sport}-${d.Event}`;

    if (!uniqueMedalsByCountry[country]) {
      uniqueMedalsByCountry[country] = new Set();
    }

    uniqueMedalsByCountry[country].add(eventSportKey);
  });

  let leastUniqueMedalsCount = Infinity;
  let leastUniqueMedalsCountry = null;

  Object.entries(uniqueMedalsByCountry).forEach(([country, eventSportSet]) => {
    const uniqueMedalsCount = eventSportSet.size;

    if (uniqueMedalsCount < leastUniqueMedalsCount) {
      leastUniqueMedalsCount = uniqueMedalsCount;
      leastUniqueMedalsCountry = country;
    }
  });

  return [leastUniqueMedalsCountry, leastUniqueMedalsCount];
}

function calculateUniqueMedalsBySport(c) {
  const countryName = normalizeCountryName(c.properties.name);

  const uniqueMedalsByCountry = {};

  olympicData.forEach((d) => {
    const country = normalizeCountryName(d.Team);
    const eventSportKey = `${d.Year}-${d.Sport}-${d.Event}`;

    if (!uniqueMedalsByCountry[country]) {
      uniqueMedalsByCountry[country] = new Set();
    }

    uniqueMedalsByCountry[country].add(eventSportKey);
  });

  let MedalsCount = Infinity;
  let MedalsCountry = null;

  Object.entries(uniqueMedalsByCountry).forEach(([country, eventSportSet]) => {
    const uniqueMedalsCount = eventSportSet.size;

    if (country == countryName) {
      MedalsCount = uniqueMedalsCount;
    }
  });

  return MedalsCount;
}
