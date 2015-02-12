import sys

pos = [ '0', '0', '0' ]
tex = [ '0', '0' ]
nrm = [ '0', '0', '0' ]

indexMap = {}

combinedPos = []
combinedIdx = []

for line in open( sys.argv[1], "rb") :
	tokens = line.split()
	if ( len(tokens) < 1 ) :
		continue
	if ( tokens[0] == 'v' ) :
		pos.append(tokens[1])
		pos.append(tokens[2])
		pos.append(tokens[3])
	if ( tokens[0] == 'vt' ) :
		if ( len(tokens) > 1 ) :
			tex.append(tokens[1])
		else:
			tex.append('0.0')
		if ( len(tokens) > 2 ) :
			tex.append(tokens[2])
		else:
			tex.append('0.0')
	if ( tokens[0] == 'vn' ) :
		nrm.append(tokens[1])
		nrm.append(tokens[2])
		nrm.append(tokens[3])

	if ( tokens[0] == 'f' ) :
		for idx in tokens[1:] :
			indices = idx.split('/')
			key = indices[0]
			if ( len(indices) > 1 and (int)(indices[1]) ) :
				key = key + '/' + indices[1]
			else :
				key = key + '/0'
			if ( len(indices) > 2 and (int)(indices[2]) ) :
				key = key + '/' + indices[2]
			else :
				key = key + '/0'
			print key
			if ( indexMap.has_key(key) == False ) :
				indexMap[key] = len(combinedPos)/5
				combinedPos.append( float(pos[int(indices[0])*3+0]))
				combinedPos.append( float(pos[int(indices[0])*3+1]))
				combinedPos.append( float(pos[int(indices[0])*3+2]))
				combinedPos.append( float(tex[int(indices[1])*2+0]))
				combinedPos.append( float(tex[int(indices[1])*2+1]))
			combinedIdx.append( indexMap[key] )


o = open( sys.argv[2], "wb" )
o.write( str(combinedPos) )
o.write( '\n' )
o.write( str(combinedIdx) )
