# Add the state_machine_arn output
output "state_machine_arn" {
  description = "ARN of the Step Functions state machine"
  value       = aws_sfn_state_machine.audio_transcription_workflow.arn
}
