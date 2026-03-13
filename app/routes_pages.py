from flask import Blueprint, render_template

pages_bp = Blueprint('pages', __name__)

@pages_bp.route("/")
def index():
    # This serves the main wrapper page we created
    return render_template("base.html")
from flask import Blueprint, render_template

pages_bp = Blueprint('pages', __name__)

@pages_bp.route("/")
def index():
    return render_template("base.html") 

# NEW: The dedicated projector screen
@pages_bp.route("/projector")
def projector():
    return render_template("projector.html")