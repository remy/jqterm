[ .sections | 
map(select(.entries?))[] | 
{ 
  label: .title, 
  submenu: [.entries | map(select(.examples))[] | {
  	label: .title,
    dataSource: .examples[0].input,
    dataInput: .examples[0].program,
  }]
} ]