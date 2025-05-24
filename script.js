// Global variables
const COLOR_SCHEMES = {
    isolated: "#2196F3",    // Blue for nodes with 0-1 connections
    few: "#E91E63",        // Pink for nodes with 2-3 connections
    moderate: "#4CAF50",   // Green for nodes with 4-5 connections
    many: "#FF9800",       // Orange for nodes with 6+ connections
    default: "#9E9E9E"     // Gray for nodes with no connections
};

// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize UI elements
    const elements = {
        analyzeButton: document.getElementById('analyzeButton'),
        findOptimalButton: document.getElementById('findOptimalButton'),
        fileInput: document.getElementById('fileInput'),
        resourceSlider: document.getElementById('resourceSlider'),
        resourceValue: document.getElementById('resourceSliderValue'),
        runButton: document.getElementById('runButton'),
        fileError: document.getElementById('fileError')
    };

    // Add event listeners
    if (elements.analyzeButton && elements.findOptimalButton && elements.fileInput) {
        elements.analyzeButton.addEventListener('click', handleAnalyzeClick);
        elements.findOptimalButton.addEventListener('click', handleFindOptimalClick);
    } else {
        console.error('Required elements not found in the DOM');
    }

    elements.resourceSlider.addEventListener('input', function() {
        const value = this.value;
        elements.resourceValue.textContent = value;
        
        if (elements.fileInput.files.length > 0) {
            processFile(elements.fileInput.files[0], parseInt(value));
        }
    });

    elements.runButton.addEventListener('click', function() {
        elements.fileError.style.display = 'none';

        if (elements.fileInput.files.length === 0) {
            alert('Please upload an input file first!');
            return;
        }

        const file = elements.fileInput.files[0];
        
        if (!file.name.endsWith('.txt')) {
            elements.fileError.style.display = 'block';
            elements.fileError.innerText = 'Invalid file type! Please upload a .txt file.';
            return;
        }

        processFile(file, parseInt(elements.resourceSlider.value));
    });
});

// Helper function to process file
function processFile(file, k) {
    const reader = new FileReader();
    reader.onload = function(event) {
        const graphData = parseGraphData(event.target.result);
        const result = runResourceAllocation(graphData, k);
        visualizeGraph(graphData, result);
        displayResult(result);
    };
    reader.readAsText(file);
}

// Event handlers
function handleAnalyzeClick() {
    const fileInput = document.getElementById('fileInput');
    if (!fileInput.files.length) {
        alert('Please upload an input file first!');
        return;
    }

    const file = fileInput.files[0];
    if (!file.name.endsWith('.txt')) {
        document.getElementById('fileError').style.display = 'block';
        return;
    }

    const reader = new FileReader();
    reader.onload = function(event) {
        const content = event.target.result;
        const graphData = parseGraphData(content);
        const analysis = analyzeGraph(graphData);
        
        displayGraphStats(analysis.stats);
        visualizeGraph(graphData, {
            connectionCounts: analysis.connectionCounts,
            allocated: graphData.nodes.map(node => ({
                nodeId: node.id,
                connections: analysis.connectionCounts[node.id]
            })),
            colorSchemes: COLOR_SCHEMES
        });
    };
    reader.readAsText(file);
}

function handleFindOptimalClick() {
    const fileInput = document.getElementById('fileInput');
    if (!fileInput.files.length) {
        alert('Please upload an input file first!');
        return;
    }

    const file = fileInput.files[0];
    if (!file.name.endsWith('.txt')) {
        document.getElementById('fileError').style.display = 'block';
        return;
    }

    const reader = new FileReader();
    reader.onload = function(event) {
        const content = event.target.result;
        const graphData = parseGraphData(content);
        const result = findOptimalAllocation(graphData);
        
        displayAllocationResults(result);
        displayGraphStats(result.analysis.stats);
        visualizeGraph(graphData, result);
    };
    reader.readAsText(file);
}

// Resource Allocation Algorithm
function runResourceAllocation(graphData, k) {
    console.log("Running resource allocation with k =", k);

    // Count connections for each node
    const connectionCounts = graphData.nodes.reduce((counts, node) => {
        counts[node.id] = 0;
        return counts;
    }, {});

    graphData.links.forEach(link => {
        connectionCounts[link.source]++;
        connectionCounts[link.target]++;
    });

    // Simulate the allocation process
    const allocation = {
        steps: [],
        currentStep: 0,
        allocated: [],
        availableResources: new Array(k).fill(true)
    };

    // Sort nodes by number of connections (descending)
    const sortedNodes = [...graphData.nodes].sort((a, b) => 
        connectionCounts[b.id] - connectionCounts[a.id]
    );

    // Allocation process
    for (const node of sortedNodes) {
        const connections = connectionCounts[node.id];
        let resourceAssigned = false;

        // Try to find an available resource
        for (let r = 0; r < k; r++) {
            if (allocation.availableResources[r]) {
                const hasConflict = allocation.allocated.some(alloc => 
                    alloc.resourceId === r && graphData.links.some(link => 
                        (link.source === node.id && link.target === alloc.nodeId) ||
                        (link.target === node.id && link.source === alloc.nodeId)
                    )
                );

                if (!hasConflict) {
                    const color = connections <= 1 ? COLOR_SCHEMES.isolated :
                                connections <= 3 ? COLOR_SCHEMES.few :
                                connections <= 5 ? COLOR_SCHEMES.moderate :
                                COLOR_SCHEMES.many;

                    allocation.allocated.push({
                        nodeId: node.id,
                        resourceId: r,
                        color,
                        connections,
                        step: allocation.currentStep
                    });

                    allocation.steps.push({
                        step: allocation.currentStep,
                        node: node.id,
                        resource: r,
                        message: `Assigned Resource ${r} to Node ${node.id}`
                    });

                    resourceAssigned = true;
                    allocation.currentStep++;
                    break;
                }
            }
        }

        if (!resourceAssigned) {
            allocation.allocated.push({
                nodeId: node.id,
                resourceId: -1,
                color: COLOR_SCHEMES.default,
                connections,
                step: allocation.currentStep
            });

            allocation.steps.push({
                step: allocation.currentStep,
                node: node.id,
                resource: -1,
                message: `Failed to allocate resource to Node ${node.id}`
            });

            allocation.currentStep++;
        }
    }

    return {
        success: allocation.allocated.every(a => a.resourceId !== -1),
        allocated: allocation.allocated,
        k,
        connectionCounts,
        colorSchemes: COLOR_SCHEMES,
        steps: allocation.steps,
        currentStep: 0
    };
}

// Parse input graph data from file
function parseGraphData(content) {
    let lines = content.split("\n");
    let graphData = {
        nodes: [],
        links: []
    };

    lines.forEach(line => {
        let parts = line.split(" --> ");
        if (parts.length > 1) {
            let nodeId = parts[0].trim();
            let conflicts = parts[1].trim().split(" ");

            graphData.nodes.push({ id: nodeId });
            conflicts.forEach(conflict => {
                graphData.links.push({ source: nodeId, target: conflict });
            });
        }
    });

    return graphData;
}

// Visualize graph using D3.js
function visualizeGraph(graphData, result) {
    const svg = d3.select('#graph');
    svg.selectAll("*").remove();  // Clear previous content

    // Set up the size for the SVG element
    let width = window.innerWidth - 50;
    let height = window.innerHeight - 200;

    svg.attr('width', width)
       .attr('height', height);

    // Define the zoom behavior
    const zoom = d3.zoom()
        .scaleExtent([0.1, 4])
        .on('zoom', function(event) {
            g.attr('transform', event.transform);
        });
    
    // Create a group for all elements
    const g = svg.append('g');
    
    // Apply zoom behavior
    svg.call(zoom);

    // Create links (edges)
    const links = g.selectAll("line")
        .data(graphData.links)
        .enter()
        .append("line")
        .attr("stroke", "#999")
        .attr("stroke-width", 2)
        .attr("marker-end", "url(#arrowhead)");

    // Add arrow markers
    svg.append("defs").append("marker")
        .attr("id", "arrowhead")
        .attr("viewBox", "-0 -5 10 10")
        .attr("refX", 25)
        .attr("refY", 0)
        .attr("orient", "auto")
        .attr("markerWidth", 6)
        .attr("markerHeight", 6)
        .attr("xoverflow", "visible")
        .append("svg:path")
        .attr("d", "M 0,-5 L 10 ,0 L 0,5")
        .attr("fill", "#999");

    // Add step-by-step legend
    const legend = g.append("g")
        .attr("class", "legend")
        .attr("transform", "translate(20, 20)");

    
    // Create nodes with connection-based colors
    const nodes = g.selectAll("circle")
        .data(graphData.nodes)
        .enter()
        .append("circle")
        .attr("r", 20)
        .attr("fill", d => {
            const allocation = result.allocated.find(a => a.nodeId === d.id);
            return allocation ? allocation.color : result.colorSchemes.default;
        })
        .attr("stroke", "#333")
        .attr("stroke-width", 2)
        .call(d3.drag()
            .on("start", dragstart)
            .on("drag", dragged)
            .on("end", dragend));

    // Add node labels with connection count and resource
    const nodeLabels = g.selectAll("text")
        .data(graphData.nodes)
        .enter()
        .append("text")
        .attr("dy", -30)
        .text(d => {
            const allocation = result.allocated.find(a => a.nodeId === d.id);
            if (allocation) {
                return allocation.resourceId !== -1 
                    ? `${d.id} (R${allocation.resourceId})` 
                    : `${d.id} (Unallocated)`;
            }
            return d.id;
        })
        .attr("text-anchor", "middle")
        .attr("font-size", "14px")
        .attr("font-weight", "bold");

    // Add allocation steps display
    const stepsDiv = document.getElementById('allocationSteps');
    stepsDiv.innerHTML = '<h3>Allocation Steps:</h3>';
    result.steps.forEach(step => {
        const stepDiv = document.createElement('div');
        stepDiv.className = 'allocation-step';
        stepDiv.innerHTML = `Step ${step.step + 1}: ${step.message}`;
        stepsDiv.appendChild(stepDiv);
    });

    // Simulate force-directed graph for layout
    const simulation = d3.forceSimulation(graphData.nodes)
        .force("link", d3.forceLink(graphData.links)
            .id(d => d.id)
            .distance(100)
            .strength(1))
        .force("charge", d3.forceManyBody().strength(-300))
        .force("center", d3.forceCenter(width / 2, height / 2))
        .force("collide", d3.forceCollide(50));

    simulation.on("tick", function() {
        links
            .attr("x1", d => d.source.x)
            .attr("y1", d => d.source.y)
            .attr("x2", d => d.target.x)
            .attr("y2", d => d.target.y);

        nodes
            .attr("cx", d => d.x)
            .attr("cy", d => d.y);

        nodeLabels
            .attr("x", d => d.x)
            .attr("y", d => d.y);
    });

    // Add hover effects
    nodes.on("mouseover", function() {
        d3.select(this)
            .attr("fill", "#FF5722")
            .attr("r", 25);
    })
    .on("mouseout", function() {
        d3.select(this)
            .attr("fill", "#4CAF50")
            .attr("r", 20);
    });
}

// Drag events for the nodes
function dragstart(event, d) {
    if (!event.active) simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
}

function dragged(event, d) {
    d.fx = event.x;
    d.fy = event.y;
}

function dragend(event, d) {
    if (!event.active) simulation.alphaTarget(0);
    d.fx = null;
    d.fy = null;
}

// Display the allocation result (success or failure)
function displayResult(result) {
    const resultDiv = document.getElementById('result');
    resultDiv.style.padding = '15px';
    resultDiv.style.borderRadius = '5px';
    resultDiv.style.marginTop = '20px';
    
    if (result.success) {
        resultDiv.style.backgroundColor = '#dff0d8';
        resultDiv.style.color = '#3c763d';
        resultDiv.style.border = '1px solid #d6e9c6';
        resultDiv.innerHTML = `
            <h3>Allocation Successful!</h3>
            <p>All nodes were allocated resources without conflicts.</p>
            <p>Total resources used: ${result.k}</p>
        `;
    } else {
        resultDiv.style.backgroundColor = '#f2dede';
        resultDiv.style.color = '#a94442';
        resultDiv.style.border = '1px solid #ebccd1';
        resultDiv.innerHTML = `
            <h3>Allocation Failed!</h3>
            <p>Could not allocate resources to all nodes without conflicts.</p>
            <p>Try increasing the number of resources.</p>
        `;
    }
}

// Graph analysis and resource allocation functions
function analyzeGraph(graphData) {
    // Count connections for each node
    const connectionCounts = {};
    graphData.nodes.forEach(node => {
        connectionCounts[node.id] = 0;
    });

    graphData.links.forEach(link => {
        connectionCounts[link.source]++;
        connectionCounts[link.target]++;
    });

    // Calculate graph statistics
    const stats = {
        totalNodes: graphData.nodes.length,
        totalEdges: graphData.links.length,
        maxConnections: Math.max(...Object.values(connectionCounts)),
        minConnections: Math.min(...Object.values(connectionCounts)),
        avgConnections: Object.values(connectionCounts).reduce((a, b) => a + b, 0) / graphData.nodes.length,
        isolatedNodes: Object.values(connectionCounts).filter(count => count === 0).length
    };

    return {
        connectionCounts,
        stats
    };
}

function findOptimalAllocation(graphData) {
    const analysis = analyzeGraph(graphData);
    const { connectionCounts } = analysis;
    
    // Start with minimum possible resources (2)
    let k = 2;
    let bestAllocation = null;
    let maxAttempts = Math.min(10, graphData.nodes.length); // Limit maximum resources to try

    while (k <= maxAttempts) {
        const result = runResourceAllocation(graphData, k);
        if (result.success) {
            bestAllocation = result;
            break; // Found the minimum number of resources needed
        }
        k++;
    }

    if (!bestAllocation) {
        // If we couldn't find a solution with reasonable resources, use the last attempt
        bestAllocation = runResourceAllocation(graphData, maxAttempts);
    }

    return {
        ...bestAllocation,
        analysis
    };
}

// Display functions
function displayGraphStats(stats) {
    const statsDiv = document.getElementById('graphStats');
    if (statsDiv) {
        statsDiv.innerHTML = `
            <h3>Graph Statistics</h3>
            <div class="stats-grid">
                <div class="stat-item">
                    <strong>Total Nodes:</strong> ${stats.totalNodes}
                </div>
                <div class="stat-item">
                    <strong>Total Edges:</strong> ${stats.totalEdges}
                </div>
                <div class="stat-item">
                    <strong>Max Connections:</strong> ${stats.maxConnections}
                </div>
                <div class="stat-item">
                    <strong>Min Connections:</strong> ${stats.minConnections}
                </div>
                <div class="stat-item">
                    <strong>Avg Connections:</strong> ${stats.avgConnections.toFixed(2)}
                </div>
                <div class="stat-item">
                    <strong>Isolated Nodes:</strong> ${stats.isolatedNodes}
                </div>
            </div>
        `;
    }
}

function displayAllocationResults(result) {
    const resultsDiv = document.getElementById('allocationResults');
    if (resultsDiv) {
        resultsDiv.innerHTML = `
            <h3>Allocation Results</h3>
            <div class="stats-grid">
                <div class="stat-item">
                    <strong>Resources Used:</strong> ${result.k}
                </div>
                <div class="stat-item">
                    <strong>Allocation Status:</strong> ${result.success ? 'Successful' : 'Failed'}
                </div>
                <div class="stat-item">
                    <strong>Nodes Allocated:</strong> ${result.allocated.filter(a => a.resourceId !== -1).length}/${result.allocated.length}
                </div>
            </div>
        `;
    }
}
