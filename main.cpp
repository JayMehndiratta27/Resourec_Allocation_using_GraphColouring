#include <iostream>
#include <list>
#include <map>
#include <string>
#include <climits>
#include <vector>

using namespace std;

class Process {
public:
    int pid;
    map<int, bool> resource_conflicts;
    int allocated_resource;
    int current_conflicts;
    int original_conflicts;
    bool active;

    Process() {
        active = true;
        current_conflicts = 0;
        original_conflicts = 0;
        pid = -1;
        allocated_resource = -1;
    }

    Process(int id) {
        active = true;
        current_conflicts = 0;
        original_conflicts = 0;
        pid = id;
        allocated_resource = -1;
    }

    void add_conflict(int other_pid) {
        resource_conflicts[other_pid] = true;
        current_conflicts++;
        original_conflicts++;
    }

    void resolve_conflict(int other_pid) {
        if (resource_conflicts[other_pid]) {
            resource_conflicts[other_pid] = false;
            current_conflicts--;
        }
    }

    void reset_conflicts() {
        current_conflicts = original_conflicts;
        for (auto& entry : resource_conflicts) {
            entry.second = true;
        }
    }

    bool can_allocate(int resource_id, const vector<Process>& processes, int size) {
        for (auto& entry : resource_conflicts) {
            int other_pid = entry.first;
            if (entry.second) {
                for (int i = 0; i < size; i++) {
                    if (processes[i].pid == other_pid && processes[i].allocated_resource == resource_id)
                        return false;
                }
            }
        }
        return true;
    }

    void deactivate() { active = false; }
};

list<string> read_input() {
    list<string> lines;
    string line;
    while (getline(cin, line)) {
        lines.push_back(line);
    }
    return lines;
}

void build_graph(vector<Process>& processes, list<string> lines) {
    int i = 0;
    for (const string& raw_line : lines) {
        string line = raw_line;
        size_t pos = 0;
        Process proc;

        if ((pos = line.find(" -->")) != string::npos) {
            int id = stoi(line.substr(0, pos));
            proc = Process(id);
            line.erase(0, pos + 4);
        }

        while ((pos = line.find(" ")) != string::npos || (pos = line.find("\n")) != string::npos) {
            string token = line.substr(0, pos);
            if (!token.empty()) {
                int conflict_pid = stoi(token);
                proc.add_conflict(conflict_pid);
            }
            line.erase(0, pos + 1);
        }

        processes[i++] = proc;
    }
}

int find_lowest_conflict(int max_resources, int size, const vector<Process>& processes) {
    int min_conflict = INT_MAX, index = -1;
    for (int i = 0; i < size; i++) {
        if (!processes[i].active) continue;
        if (processes[i].current_conflicts < max_resources && processes[i].current_conflicts < min_conflict) {
            min_conflict = processes[i].current_conflicts;
            index = i;
        }
    }
    return index;
}

int find_highest_conflict(int size, const vector<Process>& processes) {
    int max_conflict = -1, index = -1;
    for (int i = 0; i < size; i++) {
        if (processes[i].active && processes[i].current_conflicts > max_conflict) {
            max_conflict = processes[i].current_conflicts;
            index = i;
        }
    }
    return index;
}

void remove_conflicts(vector<Process>& processes, int pid, int size) {
    for (int i = 0; i < size; i++) {
        if (!processes[i].active) continue;
        processes[i].resolve_conflict(pid);
    }
}

list<Process> simplify(int k, vector<Process>& processes, int size) {
    list<Process> stack;
    int count = size;

    while (count > 0) {
        int index = find_lowest_conflict(k, size, processes);
        if (index < 0) index = find_highest_conflict(size, processes);

        cout << "Waiting to Allocate: Process " << processes[index].pid;
        if (processes[index].current_conflicts >= k) cout << " (High contention)";
        cout << endl;

        stack.push_back(processes[index]);
        remove_conflicts(processes, processes[index].pid, size);
        processes[index].deactivate();
        count--;
    }

    return stack;
}

bool assign_resources(int k, list<Process> stack, vector<Process>& processes, int size) {
    while (!stack.empty()) {
        Process proc = stack.back();
        stack.pop_back();
        bool allocated = false;

        for (int i = 0; i < k; i++) {
            if (proc.can_allocate(i, processes, size)) {
                proc.allocated_resource = i;
                allocated = true;
                break;
            }
        }

        cout << "Process " << proc.pid;
        if (allocated)
            cout << " Assigned Resource " << proc.allocated_resource << endl;
        else {
            cout << " FAILED to Acquire Resource (SPILL)" << endl;
            return false;
        }

        for (int i = 0; i < size; i++) {
            if (processes[i].pid == proc.pid) {
                processes[i] = proc;
                break;
            }
        }
    }
    return true;
}

void reset_all(int size, vector<Process>& processes) {
    for (int i = 0; i < size; i++) {
        processes[i].active = true;
        processes[i].allocated_resource = -1;
        processes[i].reset_conflicts();
    }
}

int main() {
    string header, k_line;
    getline(cin, header);
    getline(cin, k_line);

    // Debug
    cout << "Raw Header Input: [" << header << "]" << endl;

    header.erase(0, header.find(":") + 1);
    header.erase(0, header.find_first_not_of(" \t"));

    cout << "Trimmed Header: [" << header << "]" << endl;

    k_line.erase(0, k_line.find(":") + 1);
    k_line.erase(0, k_line.find_first_not_of(" \t"));

    int k = stoi(k_line);

    cout << "Resource Allocation Simulation for Graph " << header << " with Max Resources = " << k << endl;
    cout << "--------------------------------------------------\n\n";

    list<string> lines = read_input();
    vector<Process> processes(lines.size());
    vector<bool> results(k + 1);

    build_graph(processes, lines);

    for (int r = k; r >= 2; r--) {
        cout << "Attempting Allocation with " << r << " Resources\n";
        list<Process> stack = simplify(r, processes, lines.size());
        results[r] = assign_resources(r, stack, processes, lines.size());
        reset_all(lines.size(), processes);
        cout << "--------------------------------------------------\n";
    }

    for (int r = k; r >= 2; r--) {
        cout << "Graph " << header << " -> Resources = " << r << ": ";
        if (results[r]) cout << "Successful Allocation";
        else cout << "SPILL (Conflict could not be resolved)";
        cout << endl;
    }

    return 0;
}
