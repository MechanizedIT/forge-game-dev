extends CharacterBody2D


func _physics_process(_delta: float) -> void:
	# The prepared quest will replace this intentionally idle baseline.
	velocity = Vector2.ZERO
