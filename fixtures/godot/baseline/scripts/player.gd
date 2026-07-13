extends CharacterBody2D

@export var speed := 240.0


func _physics_process(_delta: float) -> void:
	velocity = Input.get_vector("ui_left", "ui_right", "ui_up", "ui_down") * speed
	move_and_slide()
	position.x = clampf(position.x, 40.0, 920.0)
	position.y = clampf(position.y, 120.0, 400.0)
