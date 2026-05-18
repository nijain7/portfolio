import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
let xScale; 
let yScale;
let commitProgress = 100;

console.log('xScale type:', typeof xScale); // should log "function"
console.log('yScale type:', typeof yScale); // should log "function"
async function loadData() {
  const data = await d3.csv('loc.csv', (row) => ({
    ...row,
    line: Number(row.line),
    depth: Number(row.depth),
    length: Number(row.length),
    date: new Date(row.date + 'T00:00' + row.timezone),
    datetime: new Date(row.datetime),
  }));
  return data;
}

function processCommits(data) {
  return d3
    .groups(data, (d) => d.commit)
    .map(([commit, lines]) => {
      let first = lines[0];
      let { author, date, time, timezone, datetime } = first;
      let ret = {
        id: commit,
        url: 'https://github.com/vis-society/lab-7/commit/' + commit,
        author,
        date,
        time,
        timezone,
        datetime,
        hourFrac: datetime.getHours() + datetime.getMinutes() / 60,
        totalLines: lines.length,
      };

      Object.defineProperty(ret, 'lines', {
        value: lines,
        configurable: false,
        writable: false,
        enumerable: false,
      });

      return ret; 
    });
}
function renderCommitInfo(data, commits) {
    const dl = d3.select('#stats').append('dl').attr('class', 'stats');
  
    // Total LOC
    dl.append('div').call(div => {
        div.append('dt').html('Total <abbr title="Lines of code">LOC</abbr>');
        div.append('dd').text(data.length);
    });
  
    // Total commits
    dl.append('div').call(div => {
        div.append('dt').text('Total commits');
        div.append('dd').text(commits.length);
    });

    // Number of files
    const numFiles = d3.group(data, d => d.file).size;
    dl.append('div').call(div => {
        div.append('dt').text('Number of files');
        div.append('dd').text(numFiles);
    });

    // Avg file length
    const fileLengths = d3.rollups(data, v => v.length, d => d.file);
    const avgFileLength = Math.round(d3.mean(fileLengths, d => d[1]));
    dl.append('div').call(div => {
        div.append('dt').text('Avg file length');
        div.append('dd').text(avgFileLength + ' lines');
    });

    // Most active time
    const workByPeriod = d3.rollups(
        data,
        (v) => v.length,
        (d) => new Date(d.datetime).toLocaleString('en', { dayPeriod: 'short' }),
    );
    const maxPeriod = d3.greatest(workByPeriod, (d) => d[1])?.[0];
    dl.append('div').call(div => {
        div.append('dt').text('Most active time');
        div.append('dd').text(maxPeriod);
    });
  }
    function renderScatterPlot(data, commits) {
      const width = 1000;
      const height = 600;
    
      const svg = d3.select('#chart').append('svg')
        .attr('viewBox', `0 0 ${width} ${height}`)
        .style('overflow', 'visible');
    
      const margin = { top: 10, right: 10, bottom: 30, left: 20 };
      const usableArea = {
        top: margin.top,
        right: width - margin.right,
        bottom: height - margin.bottom,
        left: margin.left,
        width: width - margin.left - margin.right,
        height: height - margin.top - margin.bottom,
      };
    
      xScale = d3.scaleTime()
        .domain(d3.extent(commits, (d) => d.datetime))
        .range([usableArea.left, usableArea.right])
        .nice();
    
      yScale = d3.scaleLinear()
        .domain([0, 24])
        .range([usableArea.bottom, usableArea.top]);
    
      const [minLines, maxLines] = d3.extent(commits, (d) => d.totalLines);
      const rScale = d3.scaleSqrt()
        .domain([minLines, maxLines])
        .range([2, 30]);
    
      // X Axis
      svg.append('g')
        .attr('transform', `translate(0, ${usableArea.bottom})`)
        .attr('class', 'x-axis') // new line to mark the g tag
        .call(d3.axisBottom(xScale));
    
      // Y Axis
      svg.append('g')
        .attr('transform', `translate(${usableArea.left}, 0)`)
        .call(d3.axisLeft(yScale)
          .tickFormat((d) => String(d % 24).padStart(2, '0') + ':00'));
    
      // Gridlines
      svg.append('g')
        .attr('class', 'gridlines')
        .attr('transform', `translate(${usableArea.left}, 0)`)
        .attr('class', 'y-axis') // just for consistency
        .call(d3.axisLeft(yScale).tickFormat('').tickSize(-usableArea.width));
    
      // Dots
      const dots = svg.append('g').attr('class', 'dots');
      const sortedCommits = d3.sort(commits, (d) => -d.totalLines);
      dots.selectAll('circle')
        .data(sortedCommits, (d) => d.id)
        .join('circle')
        .attr('cx', (d) => xScale(d.datetime))
        .attr('cy', (d) => yScale(d.hourFrac))
        .attr('r', (d) => rScale(d.totalLines))
        //.style('fill-opacity', 0.4)
        .on('mouseenter', (event, commit) => {
          //d3.select(event.currentTarget).style('fill-opacity', 1);
          renderTooltipContent(commit);
          updateTooltipVisibility(true);
          updateTooltipPosition(event);
        })
        .on('mouseleave', (event) => {
          //d3.select(event.currentTarget).style('fill-opacity', 0.4);
          updateTooltipVisibility(false);
        });
    
      // Brush
      createBrushSelector(svg);
    }
function renderTooltipContent(commit) {
  const link = document.getElementById('commit-link');
  const date = document.getElementById('commit-date');
  const time = document.getElementById('commit-time');
  const author = document.getElementById('commit-author');
  const lines = document.getElementById('commit-lines');


  if (Object.keys(commit).length === 0) return;

  link.href = commit.url;
  link.textContent = commit.id;
  date.textContent = commit.datetime?.toLocaleString('en', {
    dateStyle: 'full',
  });
  time.textContent = commit.datetime?.toLocaleString('en', { timeStyle: 'short' });
  author.textContent = commit.author;
  lines.textContent = commit.totalLines;
}
function updateTooltipVisibility(isVisible) {
  const tooltip = document.getElementById('commit-tooltip');
  tooltip.hidden = !isVisible;
}
function updateTooltipPosition(event) {
  const tooltip = document.getElementById('commit-tooltip');
  tooltip.style.left = `${event.clientX}px`;
  tooltip.style.top = `${event.clientY}px`;
}
function isCommitSelected(selection, commit) {
  if (!selection) {
    return false;
  }
  
  const [[x0, y0], [x1, y1]] = selection;
  const x = xScale(commit.datetime);
  const y = yScale(commit.hourFrac);
  
  return x >= x0 && x <= x1 && y >= y0 && y <= y1;
}
function renderSelectionCount(selection) {
  const selectedCommits = selection
    ? commits.filter((d) => isCommitSelected(selection, d))
    : [];

  const countElement = document.querySelector('#selection-count');
  countElement.textContent = `${
    selectedCommits.length || 'No'
  } commits selected`;

  return selectedCommits;
}
function renderLanguageBreakdown(selection) {
  const selectedCommits = selection
    ? commits.filter((d) => isCommitSelected(selection, d))
    : [];
  const container = document.getElementById('language-breakdown');

  if (selectedCommits.length === 0) {
    container.innerHTML = '';
    return;
  }
  const requiredCommits = selectedCommits.length ? selectedCommits : commits;
  const lines = requiredCommits.flatMap((d) => d.lines);

  // Use d3.rollup to count lines per language
  const breakdown = d3.rollup(
    lines,
    (v) => v.length,
    (d) => d.type,
  );

  // Update DOM with breakdown
  container.innerHTML = '';

  for (const [language, count] of breakdown) {
    const proportion = count / lines.length;
    const formatted = d3.format('.1~%')(proportion);

    container.innerHTML += `
            <dt>${language}</dt>
            <dd>${count} lines (${formatted})</dd>
        `;
  }
}
function brushed(event) {
  const selection = event.selection;
  console.log('selection:', selection);
  console.log('xScale:', xScale);
  console.log('yScale:', yScale);
  
  d3.selectAll('circle').classed('selected', (d) =>
    isCommitSelected(selection, d),
  );
  renderSelectionCount(selection);
  renderLanguageBreakdown(selection);
  console.log('selected circles:', document.querySelectorAll('circle.selected').length);
}
function createBrushSelector(svg) {
  const brush = d3.brush().on('start brush end', brushed);
  svg.call(brush);
  svg.selectAll('.dots, .overlay ~ *').raise();
}

function onTimeSliderChange() {
  // 1. Update commitProgress from slider value
  commitProgress = +document.getElementById('commit-progress').value;

  // 2. Invert the slider value to a date using your timeScale
  commitMaxTime = timeScale.invert(commitProgress);

  // 3. Display the date in the <time> element
  const timeEl = document.getElementById('commit-max-time');
  timeEl.textContent = commitMaxTime.toLocaleString();
  timeEl.setAttribute('datetime', commitMaxTime.toISOString());
  filteredCommits = commits.filter((d) => d.datetime <= commitMaxTime);
  updateScatterPlot(data, filteredCommits);
  updateFileDisplay(filteredCommits);
}

function updateScatterPlot(data, commits) {
  const width = 1000;
  const height = 600;
  const margin = { top: 10, right: 10, bottom: 30, left: 20 };
  const usableArea = {
    top: margin.top,
    right: width - margin.right,
    bottom: height - margin.bottom,
    left: margin.left,
    width: width - margin.left - margin.right,
    height: height - margin.top - margin.bottom,
  };

  const svg = d3.select('#chart').select('svg');

  xScale = xScale.domain(d3.extent(commits, (d) => d.datetime));

  const [minLines, maxLines] = d3.extent(commits, (d) => d.totalLines);
  const rScale = d3.scaleSqrt().domain([minLines, maxLines]).range([2, 30]);
  const xAxis = d3.axisBottom(xScale);

  const xAxisGroup = svg.select('g.x-axis');
  xAxisGroup.selectAll('*').remove();
  xAxisGroup.call(xAxis);

  const dots = svg.select('g.dots');

  const sortedCommits = d3.sort(commits, (d) => -d.totalLines);
  dots
    .selectAll('circle')
    .data(sortedCommits, (d) => d.id)
    .join('circle')
    .attr('cx', (d) => xScale(d.datetime))
    .attr('cy', (d) => yScale(d.hourFrac))
    .attr('r', (d) => rScale(d.totalLines))
    .attr('fill', 'steelblue')
    .style('fill-opacity', 0.7) // Add transparency for overlapping dots
    .on('mouseenter', (event, commit) => {
      d3.select(event.currentTarget).style('fill-opacity', 1); // Full opacity on hover
      renderTooltipContent(commit);
      updateTooltipVisibility(true);
      updateTooltipPosition(event);
    })
    .on('mouseleave', (event) => {
      d3.select(event.currentTarget).style('fill-opacity', 0.7);
      updateTooltipVisibility(false);
    });
  }
  function updateFileDisplay(filteredCommits) {
    let colors = d3.scaleOrdinal(d3.schemeTableau10);
    let lines = filteredCommits.flatMap((d) => d.lines);
    let files = d3
      .groups(lines, (d) => d.file)
      .map(([name, lines]) => {
        return { name, lines };
      })
      .sort((a, b) => b.lines.length - a.lines.length);
  
    let filesContainer = d3
      .select('#files')
      .selectAll('div')
      .data(files, (d) => d.name)
      .join((enter) =>
        enter.append('div').call((div) => {
          div.append('dt')
          .append('code');
          div.append('dd');
        }),
      );
  
      filesContainer.select('dt').html(
        (d) => `<code>${d.name}</code><small>${d.lines.length} lines</small>`
      );
      filesContainer.select('dd').text(''); // remove any leftover text
     
      filesContainer
      .select('dd')
      .selectAll('div')
      .data((d) => d.lines)
      .join('div')
      .attr('class', 'loc')
      .attr('style', (d) => `--color: ${colors(d.type)}`);
  }
  

let data = await loadData();
let commits = processCommits(data);
let filteredCommits = commits;


let timeScale = d3
  .scaleTime()
  .domain([
    d3.min(commits, (d) => d.datetime),
    d3.max(commits, (d) => d.datetime),
  ])
  .range([0, 100]);

let commitMaxTime = timeScale.invert(commitProgress);

renderCommitInfo(data, commits);
renderScatterPlot(data, commits)
updateFileDisplay(commits); 
document.getElementById('commit-progress').addEventListener('input', onTimeSliderChange);
onTimeSliderChange();