from flask import Flask, render_template, request, jsonify
from itertools import chain, combinations

app = Flask(__name__)

# Store items as sets
dictionary = {}

def powerset(s):
    """Return powerset of a set as a list of lists."""
    return [list(subset) for subset in chain.from_iterable(combinations(s, r) for r in range(len(s)+1))]

@app.route("/")
def index():
    return render_template("hello.html", data={}, union=[], intersection=[], cardinalities={}, intersection_powerset=[])

@app.route("/submit", methods=["POST"])
def submit():
    global dictionary
    names = request.form.getlist("name[]")
    items_lists = request.form.getlist("grocery_items[]")

    for name, items in zip(names, items_lists):
        item_set = {item.strip().lower() for item in items.split("\n") if item.strip()}
        if name in dictionary:
            dictionary[name].update(item_set)
        else:
            dictionary[name] = set(item_set)

    # Render-friendly dict (capitalize)
    dict_render = {k: sorted([i.capitalize() for i in v]) for k, v in dictionary.items()}

    # Union & Intersection
    all_sets = list(dictionary.values())
    union_set = set().union(*all_sets) if all_sets else set()
    intersection_set = set.intersection(*all_sets) if all_sets else set()

    # Cardinalities
    cardinalities = {k: len(v) for k, v in dictionary.items()}

    # Power set of intersection
    intersection_ps = [list(map(lambda x: x.capitalize(), subset)) for subset in powerset(intersection_set)]

    return render_template(
        "hello.html",
        data=dict_render,
        union=sorted([i.capitalize() for i in union_set]),
        intersection=sorted([i.capitalize() for i in intersection_set]),
        cardinalities=cardinalities,
        intersection_powerset=intersection_ps
    )

@app.route("/compare", methods=["POST"])
def compare():
    data = request.get_json()
    members = data.get("members", [])
    operation = data.get("operation")

    sets = [dictionary.get(m, set()) for m in members]

    result = set()
    if operation == "union":
        result = set().union(*sets)
    elif operation == "intersection":
        result = set.intersection(*sets) if sets else set()
    elif operation == "sym_diff":
        result = set()
        for s in sets:
            result = result.symmetric_difference(s) if result else s
    elif operation == "difference" and len(sets) == 2:
        result = sets[0] - sets[1]

    return jsonify(sorted([i.capitalize() for i in result]))

if __name__ == "__main__":
    app.run(debug=True)
