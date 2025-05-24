#  Resource Allocation Simulator (C++)

This project simulates **resource allocation** among conflicting processes using a graph-based approach similar to register allocation in compilers. It attempts to assign resources to each process while respecting conflict constraints and detects when **spilling** is necessary.

---

##  Features

- Graph-based conflict detection and modeling  
- Simplification phase using conflict count heuristics  
- Safe resource allocation that avoids conflicts  
- Support for multiple allocation attempts with different resource limits  
- Clear and descriptive console output  

 

---

## How to Build and Run

###  Compile the Code

```bash
g++ -std=c++11 -o resource_alloc resource_alloc.cpp
```

###  Run the Program

```bash
./resource_alloc < input.txt
```

Where `input.txt` contains the formatted input.

---


##  Project Structure

```
 resource-allocation-simulator
 ┣ 📄 resource_alloc.cpp        # Main simulation source code
 ┣ 📄 README.md                 # This README file
 ┗ 📄 input.txt                 # Sample input file (optional)
```

---

##  Applications

- Compiler design: Register allocation  
- Parallel system task scheduling  
- Resource sharing in operating systems  
- Conflict detection in graphs and networks  

