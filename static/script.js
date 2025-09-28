let mem_count = 2;

// Get members and their items from the main form (case-insensitive)
function getFormMembers() {
    const inputs = document.querySelectorAll("form#mainForm input[name='name[]']");
    const textareas = document.querySelectorAll("form#mainForm textarea[name='grocery_items[]']");
    const members = {};
    inputs.forEach((input, idx) => {
        const name = input.value.trim();
        if (name) {
            // store items as lowercase for consistency
            members[name] = textareas[idx].value
                .split("\n")
                .map(i => i.trim().toLowerCase())
                .filter(i => i !== "");
        }
    });
    return members;
}

// Add new member dynamically
document.getElementById("addmember").addEventListener("click", () => {
    mem_count++;
    const wrapper = document.createElement("div");
    wrapper.classList.add("member");
    wrapper.innerHTML = `
        <label>Enter family member ${mem_count}'s name:</label><br>
        <input type="text" name="name[]" placeholder="Chris" required><br><br>
        <label>Enter your monthly grocery items:</label><br>
        <textarea name="grocery_items[]" rows="5" cols="20"></textarea><br><br>
    `;
    document.querySelector("form#mainForm").appendChild(wrapper);
});

// Reset & submit
document.getElementById("resetAll").addEventListener("click", () => document.querySelector("form#mainForm").reset());
document.getElementById("submitAll").addEventListener("click", () => document.querySelector("form#mainForm").submit());

// Compare button
document.getElementById("compareBtn").addEventListener("click", () => {

    // Create right sidebar only once
    let rightSidebar = document.querySelector(".right-sidebar");
    if (!rightSidebar) {
        rightSidebar = document.createElement("div");
        rightSidebar.classList.add("right-sidebar");
        rightSidebar.style.cssText = `
            width: 250px;
            background: #101418;
            color: #ffd700;
            position: fixed;
            top: 0;
            right: 0;
            height: 100%;
            padding: 25px 20px;
            overflow-y: auto;
            border-left: 1px solid rgba(255,193,7,0.2);
            box-shadow: -2px 0 10px rgba(0,0,0,0.3);
            z-index: 100;
            text-align: center;
        `;
        document.body.appendChild(rightSidebar);

        // Push main header & container
        document.querySelector(".main_header").style.right = "250px";
        document.querySelector(".form_container").style.marginRight = "250px";
    }

    rightSidebar.innerHTML = "<h3>Comparison Panel</h3>";

    // Number of members to compare
    const countLabel = document.createElement("div");
    countLabel.textContent = "Number of members to compare:";
    rightSidebar.appendChild(countLabel);

    const countInput = document.createElement("input");
    countInput.type = "number";
    countInput.min = 2;
    countInput.value = 2;
    countInput.style.width = "80%";
    countInput.style.marginBottom = "10px";
    rightSidebar.appendChild(countInput);

    // Container for member dropdowns
    const membersDiv = document.createElement("div");
    rightSidebar.appendChild(membersDiv);

    // Operation buttons + result containers
    const operations = ["union", "intersection", "sym_diff", "difference"];
    const opButtons = {};

    operations.forEach(op => {
        const btn = document.createElement("button");
        btn.textContent = op.replace("_", " ").toUpperCase();
        btn.dataset.op = op;
        btn.style.width = "90%";
        btn.style.margin = "8px 0";
        rightSidebar.appendChild(btn);

        const resultDiv = document.createElement("div");
        resultDiv.id = `result-${op}`;
        resultDiv.style.marginBottom = "15px";
        rightSidebar.appendChild(resultDiv);

        opButtons[op] = { btn, resultDiv };
    });

    // Populate dropdowns
    function updateDropdowns() {
        membersDiv.innerHTML = "";
        const count = parseInt(countInput.value);
        // merge members from Flask + current form
        const formMembers = getFormMembers();
        const allMembersSet = new Set([...dictionaryMembers, ...Object.keys(formMembers)]);
        const allMembers = Array.from(allMembersSet);

        for (let i = 1; i <= count; i++) {
            const select = document.createElement("select");
            select.required = true;

            const defaultOption = document.createElement("option");
            defaultOption.value = "";
            defaultOption.textContent = `Select Member ${i}`;
            defaultOption.disabled = true;
            defaultOption.selected = true;
            select.appendChild(defaultOption);

            allMembers.forEach(member => {
                const option = document.createElement("option");
                option.value = member;
                option.textContent = member;
                select.appendChild(option);
            });

            membersDiv.appendChild(select);
            membersDiv.appendChild(document.createElement("br"));
        }
    }

    countInput.addEventListener("input", updateDropdowns);
    updateDropdowns();

    // Operation logic
    Object.values(opButtons).forEach(({ btn, resultDiv }) => {
        btn.addEventListener("click", () => {
            const selectedMembers = Array.from(membersDiv.querySelectorAll("select"))
                .map(s => s.value).filter(v => v !== "");

            if (selectedMembers.length !== parseInt(countInput.value)) {
                alert("Please select all members.");
                return;
            }

            if (btn.dataset.op === "difference" && selectedMembers.length !== 2) {
                alert("Difference requires exactly 2 members.");
                return;
            }

            // Merge dictionary from Flask + current form
            const formMembers = getFormMembers();
            const allMembersData = {};
            Object.entries(dictionaryMembersObj).forEach(([k, v]) => allMembersData[k] = v.map(i => i.toLowerCase()));
            Object.entries(formMembers).forEach(([k, v]) => allMembersData[k] = v);

            const sets = selectedMembers.map(name => new Set(allMembersData[name] || []));

            let resultSet;
            const op = btn.dataset.op;
            if (op === "union") {
                resultSet = new Set(sets.flatMap(s => Array.from(s)));
            } else if (op === "intersection") {
                resultSet = sets.reduce((a, b) => new Set([...a].filter(x => b.has(x))));
            } else if (op === "sym_diff") {
                resultSet = sets.reduce((a, b) => {
                    const diff1 = new Set([...a].filter(x => !b.has(x)));
                    const diff2 = new Set([...b].filter(x => !a.has(x)));
                    return new Set([...diff1, ...diff2]);
                });
            } else if (op === "difference") {
                resultSet = new Set([...sets[0]].filter(x => !sets[1].has(x)));
            }

            // Capitalize for display
            const displayResult = Array.from(resultSet).map(i => i.charAt(0).toUpperCase() + i.slice(1));
            resultDiv.innerHTML = `<strong>${op.replace("_", " ").toUpperCase()}:</strong> ${displayResult.join(", ") || "None"}`;
        });
    });

});
