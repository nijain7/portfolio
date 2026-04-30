import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
import { fetchJSON, renderProjects } from '../global.js';

const projects = await fetchJSON('../lib/projects.json');
const projectsContainer = document.querySelector('.projects');

let arcGenerator = d3.arc().innerRadius(0).outerRadius(50);
let colors = d3.scaleOrdinal(d3.schemeTableau10);
let selectedIndex = -1;
let query = '';

function renderPieChart(projectsGiven) {
  let svg = d3.select('svg');
  svg.selectAll('path').remove();
  d3.select('.legend').selectAll('li').remove();

  let newRolledData = d3.rollups(projectsGiven, (v) => v.length, (d) => d.year);
  let newData = newRolledData.map(([year, count]) => ({ label: year, value: count }));

  let newSliceGenerator = d3.pie().value((d) => d.value);
  let newArcData = newSliceGenerator(newData);
  let newArcs = newArcData.map((d) => arcGenerator(d));

  newArcs.forEach((arc, i) => {
    svg.append('path')
      .attr('d', arc)
      .attr('fill', colors(i))
      .attr('class', i === selectedIndex ? 'selected' : '')
      .on('click', () => {
        selectedIndex = selectedIndex === i ? -1 : i;

        svg.selectAll('path')
          .attr('class', (_, idx) => idx === selectedIndex ? 'selected' : '');

        d3.select('.legend').selectAll('li')
          .attr('class', (_, idx) => idx === selectedIndex ? 'selected legend-item' : 'legend-item');

        if (selectedIndex === -1) {
          renderProjects(projectsGiven, projectsContainer, 'h2');
        } else {
          let selectedYear = newData[selectedIndex].label;
          let filtered = projectsGiven.filter(p => p.year === selectedYear);
          console.log('selectedYear:', selectedYear, 'filtered:', filtered); // 
          renderProjects(projectsGiven.filter(p => p.year === selectedYear), projectsContainer, 'h2');
        }
      });
  });

  let legend = d3.select('.legend');
  newData.forEach((d, i) => {
    legend.append('li')
      .attr('class', i === selectedIndex ? 'selected legend-item' : 'legend-item')
      .attr('style', `--color: ${colors(i)}`)
      .html(`<span class="swatch"></span> ${d.label}`);
  });
}

renderProjects(projects, projectsContainer, 'h2');
renderPieChart(projects);

let searchInput = document.querySelector('.searchBar');
searchInput.addEventListener('input', (event) => {
  query = event.target.value;
  selectedIndex = -1; // reset selection on new search

  let filteredProjects = projects.filter((project) => {
    let values = Object.values(project).join('\n').toLowerCase();
    return values.includes(query.toLowerCase());
  });
  renderProjects(filteredProjects, projectsContainer, 'h2');
  renderPieChart(filteredProjects);
});